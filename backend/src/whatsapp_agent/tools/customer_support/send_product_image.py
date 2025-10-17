from agents import function_tool
from whatsapp_agent.utils.wa_instance import wa
from whatsapp_agent.database.chat_history import ChatHistoryDataBase
from whatsapp_agent.schema.chat_history import MessageSchema
from whatsapp_agent.utils.current_time import _get_current_karachi_time_str
from whatsapp_agent.utils.websocket import websocket_manager
from whatsapp_agent._debug import Logger

@function_tool
async def send_product_image_tool(phone_no:str, caption: str, product_image_url: str):
    """
    Send a product image to a customer. This tool is useful when you want to show product images to customers, want to compare products, or need visual confirmation of a product they're interested in purchasing.

    Args:
        phone_no (str): The customer's WhatsApp phone number (with country code, e.g., "923001234567").
        caption (str): The text to display as caption of the image (can be multiple paragraphs).
        product_image_url (str): The direct URL to the product image file (must be publicly accessible).
    
    Returns:
        str: Success message with phone number or error message if sending fails.
    """
    try:
        # Send the image via WhatsApp
        await wa.send_image(phone_no, product_image_url, caption)
        
        # Create markdown format for storage and streaming
        content_text = f"![{caption}]({product_image_url})"
        
        # Store in chat history
        chat_history_db = ChatHistoryDataBase()
        message = MessageSchema(
            time_stamp=_get_current_karachi_time_str(),
            content=content_text,
            message_type="image",
            sender="agent"
        )
        chat_history_db.add_or_create_message(phone_no, message)
        Logger.info(f"Image message stored in chat history for {phone_no}")
        
        # Stream to dashboard
        await websocket_manager.send_to_phone(phone_no, message)
        Logger.info(f"Image message streamed to dashboard for {phone_no}")
        
        return "success"
    except Exception as e:
        Logger.error(f"Error sending image to {phone_no}: {e}")
        return "failed to send image"