from fastapi import APIRouter, HTTPException, Query, Path, UploadFile, File, Form, Body
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime, timezone
import math
import os
import tempfile

from whatsapp_agent.database.chat_history import ChatHistoryDataBase
from whatsapp_agent.database.customer import CustomerDataBase
from whatsapp_agent.schema.chat_history import MessageSchema
from whatsapp_agent.schema.customer_schema import CustomerSchema
from whatsapp_agent.utils.websocket import websocket_manager
from whatsapp_agent.utils.current_time import _get_current_karachi_time_str
from whatsapp_agent.utils.wa_instance import wa
from whatsapp_agent.database.supabase_storage import SupabaseStorageManager
from whatsapp_agent._debug import Logger

# Create router
chat_router = APIRouter(prefix="/chats", tags=["Chats"])

# Pydantic models for request/response
class SendTextMessageRequest(BaseModel):
    content: str = Field(
        description="Message content",
        example="Hello there"
    )
    sender: Literal["customer", "agent", "representative"] = Field(
        description="Sender of the message",
        example="representative"
    )

class SendImageMessageRequest(BaseModel):
    caption: Optional[str] = Field(
        description="Optional caption for the image",
        example="Check out this image!"
    )
    sender: Literal["customer", "agent", "representative"] = Field(
        description="Sender of the message",
        example="representative"
    )

class SendAudioMessageRequest(BaseModel):
    sender: Literal["customer", "agent", "representative"] = Field(
        description="Sender of the message",
        example="representative"
    )

class SendDocumentMessageRequest(BaseModel):
    caption: Optional[str] = Field(
        description="Optional caption for the document",
        example="Here's the document you requested"
    )
    sender: Literal["customer", "agent", "representative"] = Field(
        description="Sender of the message",
        example="representative"
    )

class ChatMessagesResponse(BaseModel):
    phone_number: str
    messages: List[MessageSchema]
    pagination: dict
    total_messages: int

class SendMessageResponse(BaseModel):
    success: bool
    message: str
    timestamp: datetime

class CustomerWithLastMessage(CustomerSchema):
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    last_message_sender: Optional[Literal["customer", "agent", "representative"]] = None
    last_message_type: Optional[Literal["audio", "text", "image", "document", "video"]] = None

class PhoneNumbersResponse(BaseModel):
    customers: List[CustomerWithLastMessage]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_previous: bool
    total_escalated: int


chat_db = ChatHistoryDataBase()
customer_db = CustomerDataBase()
storage_manager = SupabaseStorageManager()

@chat_router.get("/list-chats")
async def list_chat_phone_numbers(
    page: int = Query(1, ge=1, description="Page number for pagination"),
    limit: int = Query(20, ge=1, le=1000, description="Number of customers per page"),
    search: Optional[str] = Query(None, min_length=1, description="Search by phone number, customer name, email, or company name"),
    tags: Optional[str] = Query(None, description="Comma-separated tags to filter by (e.g., 'vip,premium')"),
    customer_type: Optional[Literal["B2B", "D2C"]] = Query(None, description="Filter by customer type"),
    escalation_status: Optional[bool] = Query(None, description="Filter by escalation status"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    min_spend: Optional[int] = Query(None, ge=0, description="Minimum total spend filter"),
    max_spend: Optional[int] = Query(None, ge=0, description="Maximum total spend filter"),
    sort_by: Optional[Literal["updated_at", "last_message_time", "customer_name", "total_spend", "phone_number"]] = Query(
        "updated_at", 
        description="Field to sort by"
    ),
    sort_order: Optional[Literal["asc", "desc"]] = Query("desc", description="Sort order")
):
    """
    Return customers who have chats with their last message and timestamp.
    Supports pagination, search, filtering by tags/type/status, and sorting.
    
    - **page**: Page number (starting from 1)
    - **limit**: Number of customers per page (1-1000)
    - **search**: Search by phone number, customer name, email, or company name
    - **tags**: Filter by tags (comma-separated, e.g., 'vip,premium')
    - **customer_type**: Filter by B2B or D2C
    - **escalation_status**: Filter by escalation status (true/false)
    - **is_active**: Filter by active status (true/false)
    - **min_spend**: Filter customers with total spend >= this amount
    - **max_spend**: Filter customers with total spend <= this amount
    - **sort_by**: Field to sort by (updated_at, last_message_time, customer_name, total_spend, phone_number)
    - **sort_order**: Sort order (asc/desc)
    """
    try:
        # Validate spend range
        if min_spend is not None and max_spend is not None and min_spend > max_spend:
            raise HTTPException(
                status_code=400, 
                detail="min_spend cannot be greater than max_spend"
            )
        
        # We must get chats first, then join with customers
        if sort_by in ["updated_at", "last_message_time"]:
            # Get all chats sorted by updated_at
            chats_query = (
                chat_db.supabase
                .table(chat_db.TABLE_NAME)
                .select("phone_number, messages, updated_at")
                .order("updated_at", desc=(sort_order == "desc"))
            )
            
            all_chats_response = chats_query.execute()
            all_chats = all_chats_response.data or []
            
            # Extract all phone numbers from chats
            chat_phone_numbers = [chat["phone_number"] for chat in all_chats if chat.get("phone_number")]
            
            if not chat_phone_numbers:
                return PhoneNumbersResponse(
                    customers=[],
                    total=0,
                    total_escalated=0,
                    page=page,
                    limit=limit,
                    total_pages=0,
                    has_next=False,
                    has_previous=False
                )
            
            # Build customer query with filters
            customer_query = customer_db.supabase.table(customer_db.TABLE_NAME).select("*")
            
            # Filter customers who have chats
            customer_query = customer_query.in_("phone_number", chat_phone_numbers)
            
            # Apply search filter
            if search:
                search_trimmed = search.strip()
                if search_trimmed:
                    search_pattern = f"%{search_trimmed}%"
                    customer_query = customer_query.or_(
                        f"phone_number.ilike.{search_pattern},"
                        f"customer_name.ilike.{search_pattern},"
                        f"email.ilike.{search_pattern},"
                        f"company_name.ilike.{search_pattern}"
                    )
            
            # Apply customer type filter
            if customer_type:
                customer_query = customer_query.eq("customer_type", customer_type)
            
            # Apply escalation status filter
            if escalation_status is not None:
                customer_query = customer_query.eq("escalation_status", escalation_status)
            
            # Apply active status filter
            if is_active is not None:
                customer_query = customer_query.eq("is_active", is_active)
            
            # Apply spend range filters
            if min_spend is not None:
                customer_query = customer_query.gte("total_spend", min_spend)
            
            if max_spend is not None:
                customer_query = customer_query.lte("total_spend", max_spend)
            
            # Apply tags filter
            if tags:
                tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
                if tag_list:
                    customer_query = customer_query.overlaps("tags", tag_list)
            
            # Get all matching customers
            customers_response = customer_query.execute()
            customers_data = customers_response.data or []
            
            # Create lookup for customers
            customers_lookup = {c["phone_number"]: c for c in customers_data}
            
            # Create lookup for chats
            chats_lookup = {chat["phone_number"]: chat for chat in all_chats}
            
            # Build customer list in chat sort order
            all_matched_customers = []
            for chat in all_chats:
                phone_number = chat["phone_number"]
                customer_data = customers_lookup.get(phone_number)
                
                if not customer_data:
                    continue
                
                messages = chat.get("messages", [])
                if not messages:
                    continue
                
                last_message = messages[-1]
                
                customer_with_message = CustomerWithLastMessage(
                    **customer_data,
                    last_message=last_message.get("content") if last_message else None,
                    last_message_time=last_message.get("time_stamp") if last_message else None,
                    last_message_sender=last_message.get("sender") if last_message else None,
                    last_message_type=last_message.get("message_type") if last_message else None
                )
                all_matched_customers.append(customer_with_message)
            
            # If sorting by last_message_time, re-sort
            if sort_by == "last_message_time":
                def get_sort_key(customer):
                    # If no last message time, use min datetime with UTC timezone
                    if not customer.last_message_time:
                        return datetime.min.replace(tzinfo=timezone.utc)
                    
                    # If last message time has no timezone, assume UTC
                    if customer.last_message_time.tzinfo is None:
                        return customer.last_message_time.replace(tzinfo=timezone.utc)
                    
                    return customer.last_message_time

                all_matched_customers.sort(
                    key=get_sort_key,
                    reverse=(sort_order == "desc")
                )
            
            # Calculate total and pagination
            total_customers = len(all_matched_customers)
            total_pages = math.ceil(total_customers / limit) if total_customers > 0 else 0
            
            # Validate page number
            if page > total_pages and total_pages > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Page {page} does not exist. Total pages: {total_pages}"
                )
            
            # Apply pagination
            start_index = (page - 1) * limit
            end_index = start_index + limit
            paginated_customers = all_matched_customers[start_index:end_index]
            
            # Calculate total escalated
            total_escalated = sum(1 for c in all_matched_customers if c.escalation_status)
            
            return PhoneNumbersResponse(
                customers=paginated_customers,
                total=total_customers,
                total_escalated=total_escalated,
                page=page,
                limit=limit,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1
            )
        
        else:
            # For other sorting (customer fields), use customer-first approach
            # Build customer query with filters
            customer_query = customer_db.supabase.table(customer_db.TABLE_NAME).select("*", count="exact")
            
            # Apply search filter
            if search:
                search_trimmed = search.strip()
                if search_trimmed:
                    search_pattern = f"%{search_trimmed}%"
                    customer_query = customer_query.or_(
                        f"phone_number.ilike.{search_pattern},"
                        f"customer_name.ilike.{search_pattern},"
                        f"email.ilike.{search_pattern},"
                        f"company_name.ilike.{search_pattern}"
                    )
            
            # Apply customer type filter
            if customer_type:
                customer_query = customer_query.eq("customer_type", customer_type)
            
            # Apply escalation status filter
            if escalation_status is not None:
                customer_query = customer_query.eq("escalation_status", escalation_status)
            
            # Apply active status filter
            if is_active is not None:
                customer_query = customer_query.eq("is_active", is_active)
            
            # Apply spend range filters
            if min_spend is not None:
                customer_query = customer_query.gte("total_spend", min_spend)
            
            if max_spend is not None:
                customer_query = customer_query.lte("total_spend", max_spend)
            
            # Apply tags filter
            if tags:
                tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
                if tag_list:
                    customer_query = customer_query.overlaps("tags", tag_list)
            
            # Apply sorting at DB level
            if sort_by == "customer_name":
                customer_query = customer_query.order("customer_name", desc=(sort_order == "desc"))
            elif sort_by == "total_spend":
                customer_query = customer_query.order("total_spend", desc=(sort_order == "desc"))
            elif sort_by == "phone_number":
                customer_query = customer_query.order("phone_number", desc=(sort_order == "desc"))
            
            # Get total count before pagination
            count_response = customer_query.execute()
            total_customers = count_response.count or 0
            
            # Get total escalated customers count with the same filters
            escalated_query = customer_db.supabase.table(customer_db.TABLE_NAME).select("*", count="exact")
            
            # Apply the same filters as main query
            if search:
                search_trimmed = search.strip()
                if search_trimmed:
                    search_pattern = f"%{search_trimmed}%"
                    escalated_query = escalated_query.or_(
                        f"phone_number.ilike.{search_pattern},"
                        f"customer_name.ilike.{search_pattern},"
                        f"email.ilike.{search_pattern},"
                        f"company_name.ilike.{search_pattern}"
                    )
            
            if customer_type:
                escalated_query = escalated_query.eq("customer_type", customer_type)
            
            if escalation_status is not None:
                escalated_query = escalated_query.eq("escalation_status", escalation_status)
            
            if is_active is not None:
                escalated_query = escalated_query.eq("is_active", is_active)
            
            if min_spend is not None:
                escalated_query = escalated_query.gte("total_spend", min_spend)
            
            if max_spend is not None:
                escalated_query = escalated_query.lte("total_spend", max_spend)
            
            if tags:
                tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
                if tag_list:
                    escalated_query = escalated_query.overlaps("tags", tag_list)
            
            # Add escalation filter
            escalated_query = escalated_query.eq("escalation_status", True)
            escalated_response = escalated_query.execute()
            total_escalated = escalated_response.count or 0
            
            # Calculate pagination
            total_pages = math.ceil(total_customers / limit) if total_customers > 0 else 0
            
            # Validate page number
            if page > total_pages and total_pages > 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Page {page} does not exist. Total pages: {total_pages}"
                )
            
            offset = (page - 1) * limit
            
            # Apply pagination to customer query
            customer_query = customer_query.range(offset, offset + limit - 1)
            
            # Execute customer query
            customers_response = customer_query.execute()
            customers_data = customers_response.data or []
            
            if not customers_data:
                return PhoneNumbersResponse(
                    customers=[],
                    total=total_customers,
                    total_escalated=total_escalated,
                    page=page,
                    limit=limit,
                    total_pages=total_pages,
                    has_next=False,
                    has_previous=page > 1
                )
            
            # Extract phone numbers for chat lookup
            phone_numbers = [customer["phone_number"] for customer in customers_data]
            
            # Batch fetch chat data for these customers
            chats_response = (
                chat_db.supabase
                .table(chat_db.TABLE_NAME)
                .select("phone_number, messages, updated_at")
                .in_("phone_number", phone_numbers)
                .execute()
            )
            
            # Create a lookup dictionary for chats
            chats_data = {chat["phone_number"]: chat for chat in chats_response.data or []}
            
            # Build response with customer and chat data
            customers = []
            for customer_data in customers_data:
                phone_number = customer_data["phone_number"]
                chat_data = chats_data.get(phone_number)
                
                # Skip if no chat data exists
                if not chat_data or not chat_data.get("messages"):
                    Logger.warning(f"Customer {phone_number} has no chat history, skipping")
                    continue
                
                messages = chat_data.get("messages", [])
                last_message = messages[-1] if messages else None
                
                # Create customer with last message info
                customer_with_message = CustomerWithLastMessage(
                    **customer_data,
                    last_message=last_message.get("content") if last_message else None,
                    last_message_time=last_message.get("time_stamp") if last_message else None,
                    last_message_sender=last_message.get("sender") if last_message else None,
                    last_message_type=last_message.get("message_type") if last_message else None
                )
                customers.append(customer_with_message)
            
            return PhoneNumbersResponse(
                customers=customers,
                total=total_customers,
                total_escalated=total_escalated,
                page=page,
                limit=limit,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1
            )
        
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"Failed to list chat phone numbers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list chat phone numbers: {e}")
                
@chat_router.get("/{phone_number}")
async def get_chat_messages(
    phone_number: str = Path(..., description="Phone number to get messages for", example="923001234567"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    messages_count: int = Query(20, ge=1, le=100, description="Number of messages per page")
):
    """
    Get WhatsApp chat messages for a specific phone number with pagination.
    
    - **phone_number**: The phone number to retrieve messages for
    - **page**: Page number (starting from 1)
    - **messages_count**: Number of messages per page (1-100)
    """
    try:
        # Get chat data from database
        chat_data = chat_db._get_chat_by_phone(phone_number)
        
        if not chat_data or "messages" not in chat_data:
            raise HTTPException(status_code=404, detail="No chat history found for this phone number")
        
        # Convert raw message data to MessageSchema objects
        messages = [MessageSchema.model_validate(msg) for msg in chat_data["messages"]]
        total_messages = len(messages)
        
        # Calculate pagination
        total_pages = math.ceil(total_messages / messages_count)
        start_index = (page - 1) * messages_count
        end_index = start_index + messages_count
        
        # Get paginated messages (reverse order to show newest first)
        reversed_messages = list(reversed(messages))
        paginated_messages = reversed_messages[start_index:end_index]
        pagination_info = {
            "current_page": page,
            "total_pages": total_pages,
            "messages_per_page": messages_count,
            "has_next": page < total_pages,
            "has_previous": page > 1
        }
        
        return ChatMessagesResponse(
            phone_number=phone_number,
            messages=paginated_messages,
            pagination=pagination_info,
            total_messages=total_messages
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=500, 
                detail="Database table not found. Please run the database setup first."
            )
        raise HTTPException(status_code=500, detail=f"Internal server error: {error_msg}")

@chat_router.delete("/{phone_number}")
async def delete_chat_history(
    phone_number: str = Path(..., description="Phone number to clear chat for", example="923001234567")
):
    """
    Delete/clear WhatsApp chat history for a specific phone number.
    """
    try:
        # Ensure chat exists before attempting deletion
        existing_chat = chat_db._get_chat_by_phone(phone_number)
        if not existing_chat:
            raise HTTPException(status_code=404, detail="No chat history found for this phone number")

        success = chat_db.delete_chat(phone_number)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete chat history")

        return {"success": True, "message": "Chat history cleared"}

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=500,
                detail="Database table not found. Please run the database setup first."
            )
        raise HTTPException(status_code=500, detail=f"Failed to delete chat history: {error_msg}")

@chat_router.post("/{phone_number}/send")
async def send_message(
    phone_number: str = Path(..., description="Phone number to send message to", example="923001234567"),
    message_request: SendTextMessageRequest = Body(...)
):
    """
    Send a text WhatsApp message to a specific phone number.
    
    - **phone_number**: The phone number to send the message to
    - **content**: The message content
    - **sender**: Sender of the message (customer, agent, or representative)
    """
    try:
        # Validate message content
        if not message_request.content or message_request.content.strip() == "":
            raise HTTPException(status_code=400, detail="Message content cannot be empty")
        
        # Send message via WhatsApp API
        success = await wa.send_message(phone_number, message_request.content, preview_url=True)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send message via WhatsApp API")
        
        # Create message object for storage
        new_message = MessageSchema(
            time_stamp=_get_current_karachi_time_str(),
            content=message_request.content,
            message_type="text",
            sender=message_request.sender
        )
        
        # Store message in database and track stats
        try:
            db_success = chat_db.add_or_create_message(phone_number, new_message)
            if db_success:
                Logger.info(f"✅ Text message stored in database")
                # Stream to WebSocket for real-time updates
                await websocket_manager.send_to_phone(phone_number, new_message)
        except Exception as e:
            Logger.error(f"{__name__}: send_message -> ❌ Failed to store text message in database: {e}")
            # Don't fail the request if storage fails, but log it
        
        return SendMessageResponse(
            success=True,
            message="Text message sent successfully",
            timestamp=new_message.time_stamp
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=500, 
                detail="Database table not found. Please run the database setup first."
            )
        raise HTTPException(status_code=500, detail=f"Failed to send text message: {error_msg}")

@chat_router.post("/{phone_number}/send-image")
async def send_image_message(
    phone_number: str = Path(..., description="Phone number to send image to", example="923001234567"),
    file: UploadFile = File(..., description="Image file to send (JPEG, PNG, GIF)"),
    caption: Optional[str] = Form(None, description="Optional caption for the image"),
    sender: Literal["customer", "agent", "representative"] = Form(..., description="Sender of the message")
):
    """
    Send an image WhatsApp message to a specific phone number.
    
    - **phone_number**: The phone number to send the image to
    - **file**: Image file to upload and send
    - **caption**: Optional caption for the image
    - **sender**: Sender of the message (customer, agent, or representative)
    """
    temp_file_path = None
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image (JPEG, PNG, GIF)")
        
        # Validate file
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file size (WhatsApp image limit: 5MB)
        file_size = 0
        content = await file.read()
        file_size = len(content)
        
        max_size = 5 * 1024 * 1024  # 5MB for images
        if file_size > max_size:
            raise HTTPException(status_code=400, detail=f"Image file too large. Maximum size is 5MB")
        
        # Create temporary file
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(content)
            temp_file.flush()  # Ensure all data is written
            temp_file_path = temp_file.name
        
        # Send image message
        success = await wa.send_image(phone_number, temp_file_path, caption)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send image message via WhatsApp API")
        
        # Upload file to Supabase storage
        file_url = storage_manager.upload_file(temp_file_path, content_type=file.content_type)
        if not file_url:
            raise HTTPException(status_code=500, detail="Failed to upload image to storage")
        
        # Create message object for storage with markdown link
        caption_text = caption or "Image"
        content_text = f"![{caption_text}]({file_url})"
        new_message = MessageSchema(
            time_stamp=_get_current_karachi_time_str(),
            content=content_text,
            message_type="image",
            sender=sender
        )
        
        # Store message in database
        try:
            db_success = chat_db.add_or_create_message(phone_number, new_message)
            if db_success:
                await websocket_manager.send_to_phone(phone_number, new_message)
            if db_success:
                Logger.info(f"✅ Image message stored in database")
        except Exception as e:
            Logger.error(f"{__name__}: send_image_message -> ❌ Failed to store image message in database: {e}")

        return SendMessageResponse(
            success=True,
            message="Image message sent successfully",
            timestamp=new_message.time_stamp
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=500, 
                detail="Database table not found. Please run the database setup first."
            )
        raise HTTPException(status_code=500, detail=f"Failed to send image message: {error_msg}")
    finally:
        # Clean up temporary file with proper error handling
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                # Add a small delay to ensure file handle is released
                import time
                time.sleep(0.1)
                os.unlink(temp_file_path)
                Logger.info(f"✅ Temporary image file cleaned up: {temp_file_path}")
            except PermissionError as e:
                Logger.warning(f"⚠️ Could not delete temporary file {temp_file_path}: {e}")
                # On Windows, sometimes we need to wait a bit longer
                try:
                    time.sleep(0.5)
                    os.unlink(temp_file_path)
                    Logger.info(f"✅ Temporary image file cleaned up after delay: {temp_file_path}")
                except Exception as cleanup_error:
                    Logger.error(f"❌ Failed to clean up temporary file {temp_file_path}: {cleanup_error}")
            except Exception as e:
                Logger.error(f"❌ Failed to clean up temporary file {temp_file_path}: {e}")

@chat_router.post("/{phone_number}/send-audio")
async def send_audio_message(
    phone_number: str = Path(..., description="Phone number to send audio/voice to", example="923001234567"),
    file: UploadFile = File(..., description="Audio file to send (MP3, OGG, WAV)"),
    sender: Literal["customer", "agent", "representative"] = Form(..., description="Sender of the message")
):
    """
    Send an audio/voice WhatsApp message to a specific phone number.
    
    - **phone_number**: The phone number to send the audio/voice to
    - **file**: Audio file to send (MP3, OGG, WAV)
    - **sender**: Sender of the message (customer, agent, or representative)
    """
    temp_file_path = None
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file (MP3, OGG, WAV)")
        
        # Validate file
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file size (WhatsApp audio limit: 16MB)
        file_size = 0
        content = await file.read()
        file_size = len(content)
        
        max_size = 16 * 1024 * 1024  # 16MB for audio
        if file_size > max_size:
            raise HTTPException(status_code=400, detail=f"Audio file too large. Maximum size is 16MB")
        
        # Create temporary file
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(content)
            temp_file.flush()  # Ensure all data is written
            temp_file_path = temp_file.name
        
        # Upload file to Supabase storage
        file_url = storage_manager.upload_file(temp_file_path, content_type=file.content_type)
        if not file_url:
            raise HTTPException(status_code=500, detail="Failed to upload audio to storage")

        # Send audio message
        success = await wa.send_audio(phone_number, file_url)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send audio message via WhatsApp API")
        
        
        # Create message object for storage with markdown link
        content_text = f"[Audio Message]({file_url})"
        new_message = MessageSchema(
            time_stamp=_get_current_karachi_time_str(),
            content=content_text,
            message_type="audio",
            sender=sender
        )
        
        # Store message in database
        try:
            db_success = chat_db.add_or_create_message(phone_number, new_message)
            if db_success:
                Logger.info(f"✅ Audio message stored in database")
                await websocket_manager.send_to_phone(phone_number, new_message)

        except Exception as e:
            Logger.error(f"{__name__}: send_audio_message -> ❌ Failed to store audio message in database: {e}")

        return SendMessageResponse(
            success=True,
            message="Audio message sent successfully",
            timestamp=new_message.time_stamp
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=500, 
                detail="Database table not found. Please run the database setup first."
            )
        raise HTTPException(status_code=500, detail=f"Failed to send audio message: {error_msg}")
    finally:
        # Clean up temporary file with proper error handling
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                # Add a small delay to ensure file handle is released
                import time
                time.sleep(0.1)
                os.unlink(temp_file_path)
                Logger.info(f"✅ Temporary audio file cleaned up: {temp_file_path}")
            except PermissionError as e:
                Logger.warning(f"⚠️ Could not delete temporary file {temp_file_path}: {e}")
                # On Windows, sometimes we need to wait a bit longer
                try:
                    time.sleep(0.5)
                    os.unlink(temp_file_path)
                    Logger.info(f"✅ Temporary audio file cleaned up after delay: {temp_file_path}")
                except Exception as cleanup_error:
                    Logger.error(f"❌ Failed to clean up temporary file {temp_file_path}: {cleanup_error}")
            except Exception as e:
                Logger.error(f"❌ Failed to clean up temporary file {temp_file_path}: {e}")

@chat_router.post("/{phone_number}/send-document")
async def send_document_message(
    phone_number: str = Path(..., description="Phone number to send document to", example="923001234567"),
    file: UploadFile = File(..., description="Document file to send (PDF, DOC, DOCX, etc.)"),
    caption: Optional[str] = Form(None, description="Optional caption for the document"),
    sender: Literal["customer", "agent", "representative"] = Form(..., description="Sender of the message")
):
    """
    Send a document WhatsApp message to a specific phone number.
    
    - **phone_number**: The phone number to send the document to
    - **file**: Document file to upload and send
    - **caption**: Optional caption for the document
    - **sender**: Sender of the message (customer, agent, or representative)
    """
    temp_file_path = None
    try:
        # Validate file type
        allowed_types = [
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain', 'application/rtf'
        ]
        
        if not file.content_type or file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail="File must be a supported document type (PDF, DOC, DOCX, XLS, XLSX, TXT, RTF)"
            )
        
        # Validate file
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file size (WhatsApp document limit: 100MB)
        file_size = 0
        content = await file.read()
        file_size = len(content)
        
        max_size = 100 * 1024 * 1024  # 100MB for documents
        if file_size > max_size:
            raise HTTPException(status_code=400, detail=f"Document file too large. Maximum size is 100MB")
        
        # Create temporary file
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file.write(content)
            temp_file.flush()  # Ensure all data is written
            temp_file_path = temp_file.name
        
        # Send document message (assuming send_document method exists in WhatsAppMessageHandler)
        # Note: You may need to implement this method in WhatsAppMessageHandler
        try:
            success = await wa.send_document(phone_number, temp_file_path, caption)
        except AttributeError:
            # Fallback to send_message if send_document doesn't exist
            fallback_text = f"Document: {file.filename or 'Document'}"
            if caption:
                fallback_text += f" - {caption}"
            success = await wa.send_message(phone_number, fallback_text, preview_url=True)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send document message via WhatsApp API")
        
        # Upload file to Supabase storage
        file_url = storage_manager.upload_file(temp_file_path, content_type=file.content_type)
        if not file_url:
            raise HTTPException(status_code=500, detail="Failed to upload document to storage")
        
        # Create message object for storage with markdown link
        file_name = file.filename or "Document"
        caption_text = caption or file_name
        content_text = f"[{caption_text}]({file_url})"
        new_message = MessageSchema(
            time_stamp=_get_current_karachi_time_str(),
            content=content_text,
            message_type="document",
            sender=sender
        )
        
        # Store message in database
        try:
            db_success = chat_db.add_or_create_message(phone_number, new_message)
            if db_success:
                Logger.info(f"✅ Document message stored in database")
                await websocket_manager.send_to_phone(phone_number, new_message)

        except Exception as e:
            Logger.error(f"{__name__}: send_document_message -> ❌ Failed to store document message in database: {e}")

        return SendMessageResponse(
            success=True,
            message="Document message sent successfully",
            timestamp=new_message.time_stamp
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "relation" in error_msg and "does not exist" in error_msg:
            raise HTTPException(
                status_code=500, 
                detail="Database table not found. Please run the database setup first."
            )
        raise HTTPException(status_code=500, detail=f"Failed to send document message: {error_msg}")
    finally:
        # Clean up temporary file with proper error handling
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                # Add a small delay to ensure file handle is released
                import time
                time.sleep(0.1)
                os.unlink(temp_file_path)
                Logger.info(f"✅ Temporary document file cleaned up: {temp_file_path}")
            except PermissionError as e:
                Logger.warning(f"⚠️ Could not delete temporary file {temp_file_path}: {e}")
                # On Windows, sometimes we need to wait a bit longer
                try:
                    time.sleep(0.5)
                    os.unlink(temp_file_path)
                    Logger.info(f"✅ Temporary document file cleaned up after delay: {temp_file_path}")
                except Exception as cleanup_error:
                    Logger.error(f"❌ Failed to clean up temporary file {temp_file_path}: {cleanup_error}")
            except Exception as e:
                Logger.error(f"❌ Failed to clean up temporary file {temp_file_path}: {e}")
