# Import agents for handling different conversation flows
from whatsapp_agent.agents.b2b_business_support_agent.agent import B2BBusinessSupportAgent
from whatsapp_agent.agents.d2c_customer_support_agent.agent import D2CCustomerSupportAgent
from whatsapp_agent.agents.conversation_intent_router.agent import ConversationIntentRouter
from whatsapp_agent.agents.customer_greeting_agent.agent import CustomerGreetingAgent
# Import QuickBooks integration and MCP server
from whatsapp_agent.quickbook.customers import QuickBookCustomer
from whatsapp_agent.mcp.boost_mcp import get_boost_mcp_server

# Shopify base for GraphQL Admin API
from whatsapp_agent.shopify.base import ShopifyBase

# Import database handlers
from whatsapp_agent.database.supabase_storage import SupabaseStorageManager
from whatsapp_agent.database.chat_history import ChatHistoryDataBase
from whatsapp_agent.database.customer import CustomerDataBase

# Import schemas for chat history and customers
from whatsapp_agent.schema.chat_history import MessageSchema
from whatsapp_agent.schema.customer_schema import CustomerSchema, PersonalInfoSchema

# Import utilities for message handling, timestamps, and WebSocket communication
from whatsapp_agent.utils.campaign_handler import CampaignHandler
from whatsapp_agent.utils.referrals_handler import ReferralHandler
from whatsapp_agent.utils.current_time import _get_current_karachi_time_str
from whatsapp_agent.utils.wa_instance import wa
from whatsapp_agent.utils.websocket import websocket_manager

# Import context schema and formatting helpers for system prompt construction
from whatsapp_agent.context.user_context import CustomerContextSchema
from whatsapp_agent.context._formatter import customer_context_to_prompt, chat_history_to_prompt
from whatsapp_agent.context.global_context import GlobalContext, CustomerContextSchemaExtra, MessageSchemaExtra
from typing import List, Literal
import os
from pywa_async.types import Message
import tempfile
import mimetypes
from whatsapp_agent.utils.config import Config
from whatsapp_agent._debug import Logger

# Default constants for new customer creation
DEFAULT_CUSTOMER_TYPE = "D2C"
DEFAULT_TOTAL_SPEND = 0

# Initialize database and integration instances
chat_history_db = ChatHistoryDataBase()
customer_db = CustomerDataBase()
quickbook_customer = QuickBookCustomer()
referral_handler = ReferralHandler()
campaign_handler = CampaignHandler()

class WhatsappBot:
    """Handles WhatsApp incoming messages, routes them to the correct agent, and replies."""

    @classmethod
    async def execute_workflow(cls, message:Message, message_type):
        """
        Main entry point to process incoming WhatsApp messages.
        1. Receive message from WhatsApp
        2. Store message in history
        3. Retrieve or create customer
        4. Route message to appropriate agent based on intent
        5. Send agent's response back to WhatsApp and dashboard
        """
        # Ensure phone_number is available for logging in case of early failures
        try:
            phone_number = message.from_user.wa_id
        except Exception:
            phone_number = "unknown"

        try:
            if message_type == "text":
                raw_message = message.text
            elif message_type in ["image", "document", "video"]:
                raw_message = await cls._process_media_message(message, message_type)
            elif message_type in ["audio", "voice"]:
                # Transcribe audio message to text
                transcription = await cls._transcribe_audio_message(message)
                # Upload and return markdown with transcript + file URL
                raw_message = await cls._process_media_message(message, "audio", transcription=transcription)
            else:
                raw_message = f"[{message_type.upper()} MESSAGE]"
            
            phone_number = message.from_user.wa_id
            # Fetch recent chat history for context
            chat_history = chat_history_db.get_recent_chat_history_by_phone(phone_number)

            Logger.debug("Fetched chat history for customer")

            # save the incoming message from customer
            cls._save_customer_message(phone_number, raw_message, message_type)

            # Send message to dashboard WebSocket for live view
            Logger.debug(f"Streaming customer message to dashboard for phone: {phone_number}")
            await cls.stream_to_web_socket(phone_number, raw_message, "customer", message_type)

            # Get or create the customer record
            customer = cls._get_or_create_customer(phone_number)

            # If the conversation is not escalated, handle with AI agent
            if not customer_db.is_escalated(phone_number):
                # Format messages and customer context for the system prompt
                messages_context = cls._format_message(chat_history)
                customer_context = await cls._format_customer_context(customer)
                # Fetch current active campaigns
                active_campaigns = campaign_handler.get_current_active_campaigns()
                # Combine contexts into global context for agent
                global_context = GlobalContext(
                    customer_context=customer_context,
                    messages=messages_context,
                    campaigns=active_campaigns
                )
                if referral_handler._extract_codes(raw_message)[0] is not None:
                    await message.indicate_typing()
                    response = await referral_handler.referral_workflow(raw_message, phone_number, global_context)
                else:
                    # Route to the appropriate AI agent based on intent
                    await message.indicate_typing()
                    response = await cls._route_to_agent(phone_number, raw_message, global_context)

                Logger.info(f"Response from agent: {response}")
                # save the agent's response in chat history
                cls._save_agent_message(phone_number, response)

                # Send the agent's message to the dashboard in real-time
                Logger.info(f"Streaming agent response to dashboard for phone: {phone_number}")
                await cls.stream_to_web_socket(phone_number, response, "agent", message_type="text")

                # Debug print of the response
                Logger.debug(f"Response sent to {phone_number}: {response}")

                # Send to WhatsApp
                await cls.send_whatsapp_message(phone_number, response)
            else:
                # TODO: Future implementation to notify dashboard about escalation
                Logger.info(f"Customer {phone_number} is escalated, skipping AI routing.")
                pass

        except Exception as e:
            Logger.error(f"{__name__}: execute_workflow -> Error processing message for {phone_number}: {e}")

    @staticmethod
    def _save_customer_message(phone_number: str, raw_message: str, message_type):
        """Stores the customer's incoming message in chat history."""
        message = MessageSchema(
            time_stamp=_get_current_karachi_time_str(),
            content=raw_message,
            message_type=message_type,
            sender="customer",
        )
        Logger.info(f"Adding customer message to chat history: {message.content} (type: {message_type})")
        chat_history_db.add_or_create_message(phone_number, message)
        
    @staticmethod
    async def _transcribe_audio_message(message: Message) -> str:
        """Transcribe audio message to text using OpenAI Whisper."""
        try:
            # Import here to avoid circular imports
            from whatsapp_agent.utils.voice.audio import AudioProcessor
            
            Logger.info(f"Transcribing audio message from {message.from_user.wa_id}")
            
            # Initialize OpenAI client if not already done
            client = Config.get_openai_client(sync=True)
            audio_processor = AudioProcessor(client)
            
            # Download the audio file
            audio_file = await audio_processor.download_audio_from_message(message)
            if not audio_file:
                Logger.error("Failed to download audio file")
                return "[AUDIO MESSAGE - Download Failed]"
            
            # Transcribe to text
            text = await audio_processor.convert_to_text(audio_file)
            if not text:
                Logger.error("Failed to transcribe audio")
                return "[AUDIO MESSAGE - Transcription Failed]"
            
            # Clean up temporary file
            if os.path.exists(audio_file):
                os.unlink(audio_file)
            
            Logger.info(f"Successfully transcribed audio: {text}")
            return text
            
        except Exception as e:
            Logger.error(f"Error transcribing audio message: {e}")
            return "[AUDIO MESSAGE - Processing Error]"

    @staticmethod
    def _save_agent_message(phone_number: str, response: str):
        """Stores the agent's outgoing message in chat history."""
        message = MessageSchema(
            time_stamp=_get_current_karachi_time_str(),
            content=response,
            message_type="text",
            sender="agent"
        )
        Logger.info(f"Adding agent message to chat history: {message.content}")
        chat_history_db.add_or_create_message(phone_number, message)

    @staticmethod
    def _get_or_create_customer(phone_number: str):
        """
        Retrieve customer by phone number or create a new one.
        Logic: Check DB -> If not found: QB first (if found skip Shopify), then Shopify -> Create
            If found but incomplete: Update from QB if B2B, else from Shopify
        """
        customer_details = customer_db.get_customer_by_phone(phone_number)
        
        # Case 1: No customer found in database - CREATE NEW
        if not customer_details:
            # Try QuickBooks first for new customers
            qb_customer = quickbook_customer.get_customer_with_type_by_phone(phone_number)
            
            if qb_customer:
                # Create from QuickBooks data (skip Shopify since we found in QB)
                Logger.info(f"Creating new customer {phone_number} from QuickBooks data")
                new_customer = CustomerSchema(
                    phone_number=phone_number,
                    is_active=True,
                    escalation_status=False,
                    email=qb_customer.email,
                    customer_name=qb_customer.customer_name,
                    customer_quickbook_id=qb_customer.customer_quickbook_id,
                    customer_type=qb_customer.customer_type,
                    company_name=qb_customer.company_name,
                    address=qb_customer.address,
                    tags=["existing customer from QBO"],
                )
                referral_handler.check_or_create_referral(new_customer)
                customer_details = customer_db.add_customer(new_customer)
            else:
                # QB didn't have customer, try Shopify
                try:
                    shopify = ShopifyBase()
                    shopify_customer = shopify.find_customer_by_phone(phone_number)
                    
                    if shopify_customer:
                        Logger.info(f"Creating new customer {phone_number} from Shopify data")
                        email_obj = shopify_customer.get("defaultEmailAddress") or {}
                        addr = shopify_customer.get("defaultAddress") or {}
                        
                        new_customer = CustomerSchema(
                            phone_number=phone_number,
                            is_active=True,
                            escalation_status=False,
                            customer_type=DEFAULT_CUSTOMER_TYPE,
                            total_spend=shopify_customer.get("totalSpent") or DEFAULT_TOTAL_SPEND,
                            customer_name=shopify_customer.get("displayName"),
                            email=email_obj.get("email"),
                            address=", ".join([
                                part for part in [addr.get("address1"), addr.get("city"), addr.get("province"), addr.get("country"), addr.get("zip")] if part
                            ]) or None,
                            tags=["existing customer from shopify"]
                        )
                        referral_handler.check_or_create_referral(new_customer)
                        customer_details = customer_db.add_customer(new_customer)
                    else:
                        # Neither QB nor Shopify had customer, create minimal
                        Logger.info(f"Creating new customer {phone_number} without external data")
                        new_customer = CustomerSchema(
                            phone_number=phone_number,
                            is_active=True,
                            escalation_status=False,
                            customer_type=DEFAULT_CUSTOMER_TYPE,
                            total_spend=DEFAULT_TOTAL_SPEND,
                            tags=["new customer"]
                        )
                        referral_handler.check_or_create_referral(new_customer)
                        customer_details = customer_db.add_customer(new_customer)
                        
                except Exception as e:
                    Logger.error(f"Shopify lookup failed for {phone_number}: {e}")
                    # Create minimal customer if Shopify fails
                    Logger.info(f"Creating new customer {phone_number} without external data")
                    new_customer = CustomerSchema(
                        phone_number=phone_number,
                        is_active=True,
                        escalation_status=False,
                        customer_type=DEFAULT_CUSTOMER_TYPE,
                        total_spend=DEFAULT_TOTAL_SPEND
                    )
                    referral_handler.check_or_create_referral(new_customer)
                    customer_details = customer_db.add_customer(new_customer)
        
        # Case 2: Customer found but may have incomplete data - UPDATE EXISTING
        else:
            needs_update = (
                not customer_details.customer_name or
                not customer_details.email or
                (customer_details.customer_type == 'B2B' and not customer_details.customer_quickbook_id) or
                not customer_details.customer_type or
                not customer_details.company_name or
                not customer_details.is_active is None or  # Check for None since is_active could be False
                not customer_details.phone_number
            )
            
            if needs_update:
                # Check customer type to determine update source
                if customer_details.customer_type == 'B2B':
                    # B2B customers - update from QuickBooks
                    qb_customer = quickbook_customer.get_customer_with_type_by_phone(phone_number)
                    if qb_customer:
                        Logger.info(f"Updating existing B2B customer {phone_number} with QuickBooks data")
                        customer_details = customer_db.update_customer(phone_number, qb_customer.dict())
                else:
                    # Non-B2B customers - update from Shopify
                    try:
                        shopify = ShopifyBase()
                        shopify_customer = shopify.find_customer_by_phone(phone_number)
                        
                        if shopify_customer:
                            Logger.info(f"Updating existing customer {phone_number} with Shopify data")
                            email_obj = shopify_customer.get("defaultEmailAddress") or {}
                            addr = shopify_customer.get("defaultAddress") or {}
                            
                            # Properly map Shopify fields (no unpacking)
                            update_data = {}
                            if shopify_customer.get("displayName"):
                                update_data["customer_name"] = shopify_customer.get("displayName")
                            if email_obj.get("email"):
                                update_data["email"] = email_obj.get("email")
                            # if shopify_customer.get("totalSpent"):
                            #     update_data["total_spend"] = int(round(float(shopify_customer.get("totalSpent"))))
                            # Build address only if components exist
                            address_parts = [
                                addr.get("address1"), 
                                addr.get("city"), 
                                addr.get("province"), 
                                addr.get("country"), 
                                addr.get("zip")
                            ]
                            if any(address_parts):
                                update_data["address"] = ", ".join([part for part in address_parts if part])
                            
                            if update_data:  # Only update if we have data
                                customer_details = customer_db.update_customer(phone_number, update_data)[0]
                                
                    except Exception as e:
                        Logger.error(f"Shopify customer update failed for {phone_number}: {e}")
        
        # Validate and return customer schema
        customer = CustomerSchema.model_validate(customer_details)
        return customer

    @staticmethod
    async def _route_to_agent(phone_number: str, raw_message: str, global_context: GlobalContext) -> str:
        """
        Determine which agent should handle the message based on intent,
        and get the AI-generated response.
        """
        # Use the conversation intent router to decide the next agent
        openai_client = Config.get_openai_client()
        Logger.info("Routing message to appropriate agent based on intent")
        router_agent = ConversationIntentRouter(openai_client)
        sentiment = await router_agent.run(raw_message, global_context)

        if (
            sentiment.name or 
            sentiment.email or 
            sentiment.address or 
            sentiment.socials or 
            sentiment.interest_groups
        ):
            personal_info = PersonalInfoSchema(
                customer_name=sentiment.name,
                email=sentiment.email,
                address=sentiment.address,
                socials=sentiment.socials,
                interest_groups=sentiment.interest_groups
            )
            Logger.info(f"Personal info extracted: {personal_info}")
            try:
                customer_db.update_customer(phone_number, personal_info.dict())
                Logger.debug(f"Updated customer {phone_number} with personal info: {personal_info}")
            except Exception as e:
                Logger.error(f"{__name__}: _route_to_agent -> Failed to update customer info: {e}")
        Logger.debug(f"Routing sentiment: {sentiment}")
        Logger.info(f"Routing to agent: {sentiment.next_agent}")

        # Route to the appropriate agent
        if sentiment.next_agent == "CustomerGreetingAgent":
            agent = CustomerGreetingAgent(openai_client, global_context)
            return await agent.run(raw_message)

        if sentiment.next_agent == "D2CCustomerSupportAgent":
            boost_mcp_server = await get_boost_mcp_server(
                blocked_tool_names=["search_shop_policies_and_faqs","get_cart","update_cart"]
            )
            agent = D2CCustomerSupportAgent(boost_mcp_server, openai_client, global_context)
            return await agent.run(raw_message)

        if sentiment.next_agent == "B2BBusinessSupportAgent":
            boost_mcp_server = await get_boost_mcp_server(
                allowed_tool_names=["search_shop_catalog"]
            )
            agent = B2BBusinessSupportAgent(boost_mcp_server, openai_client, global_context)
            return await agent.run(raw_message)

        # If no match, raise an error
        Logger.error(f"{__name__}: _route_to_agent -> Unknown agent: {sentiment.next_agent}")
        raise ValueError(f"Unknown agent: {sentiment.next_agent}")

    @staticmethod
    async def _format_customer_context(customer: CustomerSchema) -> CustomerContextSchemaExtra:
        """
        Format the customer context for the system prompt
        by converting it to the prompt-ready format.
        """
        # Convert CustomerSchema to CustomerContextSchema
        context_data = CustomerContextSchema(
            phone_number=customer.phone_number,
            customer_type=customer.customer_type,
            customer_name=customer.customer_name,
            email=customer.email,
            address=customer.address,
            customer_quickbook_id=customer.customer_quickbook_id
        )
        # Format for prompt injection
        formatted = {
            'formatted_context': customer_context_to_prompt(context_data),
            **context_data.dict()
        }
        formatted_context = CustomerContextSchemaExtra.model_validate(formatted)
        Logger.debug(f"Formatted customer context: {formatted_context}")
        return formatted_context

    @staticmethod
    def _format_message(messages: List[MessageSchema]) -> MessageSchemaExtra:
        """
        Format chat messages for the system prompt.
        Converts message history to a string and wraps it in the schema.
        """
        formatted_message = chat_history_to_prompt(messages)
        formatted = {
            'formatted_message': formatted_message,
            'messages': messages
        }
        Logger.debug(f"Formatted message: {formatted}")
        return MessageSchemaExtra.model_validate(formatted)

    @staticmethod
    async def send_whatsapp_message(to: str, message: str):
        """Send a WhatsApp text message."""
        try:
            Logger.info(f"Sending WhatsApp message to {to}...")
            resp = await wa.send_message(to, message, preview_url=True)
            Logger.info(f"WhatsApp send response: {resp}")
        except Exception as e:
            Logger.error(f"Failed to send WhatsApp message to {to}: {e}")

    @staticmethod
    async def stream_to_web_socket(phone_number: str, message: str, sender: Literal["customer", "agent"], message_type:str):
        """
        Stream message in real-time to the dashboard via WebSocket.
        This allows live updates in the representative's chat view.
        """
            
        await websocket_manager.send_to_phone(phone_number, MessageSchema(
            content=message,
            sender=sender,
            message_type=message_type,
            time_stamp=_get_current_karachi_time_str()
        ))

    @staticmethod
    async def _process_media_message(message: Message, message_type: str, transcription: str | None = None):
        """Handle incoming media messages by downloading and storing them in Supabase"""
        try:
            # Validate supported types
            if message_type not in ["image", "video", "document", "audio"]:
                Logger.error(f"Unsupported media type: {message_type}")
                return f"[{message_type.upper()} MESSAGE]"

            media = getattr(message, message_type, None) or message.media
            if not media:
                Logger.error("No media content found in message")
                return f"[{message_type.upper()} MESSAGE - No Media]"

            # Use library helper to download the media to a temp file
            with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
                temp_path_hint = tmp_file.name  # path hint for directory

            try:
                # Provide the directory of the temp file as the destination
                temp_dir = os.path.dirname(temp_path_hint)
                saved_path = await message.download_media(filepath=temp_dir)
                Logger.info(f"Downloaded media to: {saved_path}")

                # Guess mime and filename
                mime_type, _ = mimetypes.guess_type(saved_path)
                storage_filename = os.path.basename(saved_path)

                storage_manager = SupabaseStorageManager()
                file_url = storage_manager.upload_file(saved_path, storage_filename, mime_type)

                if not file_url:
                    Logger.error("Failed to upload media to Supabase storage")
                    return f"[{message_type.upper()} MESSAGE - Upload Failed]"

                # Clean up local file
                if os.path.exists(saved_path):
                    os.unlink(saved_path)

                # Build markdown link
                if message_type == "image":
                    link_text = (message.caption or "Image") if hasattr(message, "caption") else "Image"
                    return f"![{link_text}]({file_url})"
                if message_type == "audio":
                    text = transcription or "Audio"
                    # Include both transcription and the downloadable URL in markdown
                    return f"[{text}]({file_url})"
                # document or video
                link_text = (message.caption or storage_filename) if hasattr(message, "caption") else storage_filename
                return f"![{link_text}]({file_url})"

            except Exception as e:
                Logger.error(f"Error downloading/uploading media: {e}")
                # Best-effort cleanup
                try:
                    if os.path.exists(temp_path_hint):
                        os.unlink(temp_path_hint)
                except Exception:
                    pass
                return f"[{message_type.upper()} MESSAGE - Download Failed]"

        except Exception as e:
            Logger.error(f"Error processing {message_type} message: {e}")
            import traceback
            Logger.error(f"Traceback: {traceback.format_exc()}")
            return f"[{message_type.upper()} MESSAGE - Processing Error]"