from pywa_async import WhatsApp, types, filters
from whatsapp_agent.bot.whatsapp_bot import WhatsappBot
from whatsapp_agent._debug import Logger
from whatsapp_agent.utils.wa_instance import wa  # Import the existing wa instance


@wa.on_message(filters.text)
async def handle_text_message(client: WhatsApp, msg: types.Message):
    """Handle text messages"""
    try:
        Logger.info(f"TEXT MESSAGE RECEIVED: {msg.text} from {msg.from_user.wa_id}")
        await WhatsappBot.execute_workflow(msg, message_type="text")
        
        Logger.info(f"Successfully processed text message from {msg.from_user.wa_id}")
        return True
        
    except Exception as e:
        Logger.error(f"Error processing text message: {e}")
        return False

@wa.on_message(filters.audio | filters.voice)
async def handle_voice_message(client: WhatsApp, msg: types.Message):
    """Handle voice/audio messages"""
    try:
        Logger.info(f"VOICE MESSAGE RECEIVED from {msg.from_user.wa_id}")
        await WhatsappBot.execute_workflow(msg, message_type="audio")
        
        Logger.info(f"Successfully processed voice message from {msg.from_user.wa_id}")
        return True

    except Exception as e:
        Logger.error(f"Error processing voice message: {e}")
        return False

@wa.on_message(filters.image)
async def handle_image_message(client: WhatsApp, msg: types.Message):
    """Handle image messages"""
    try:
        Logger.info(f"IMAGE MESSAGE RECEIVED from {msg.from_user.wa_id}")
        await WhatsappBot.execute_workflow(msg, message_type="image")
        
        Logger.info(f"Successfully processed image message from {msg.from_user.wa_id}")
        return True

    except Exception as e:
        Logger.error(f"Error processing image message: {e}")
        return False

@wa.on_message(filters.document)
async def handle_document_message(client: WhatsApp, msg: types.Message):
    """Handle document messages"""
    try:
        Logger.info(f"DOCUMENT MESSAGE RECEIVED from {msg.from_user.wa_id}")
        await WhatsappBot.execute_workflow(msg, message_type="document")
        
        Logger.info(f"Successfully processed document message from {msg.from_user.wa_id}")
        return True

    except Exception as e:
        Logger.error(f"Error processing document message: {e}")
        return False

@wa.on_message(filters.video)
async def handle_video_message(client: WhatsApp, msg: types.Message):
    """Handle video messages"""
    try:
        Logger.info(f"VIDEO MESSAGE RECEIVED from {msg.from_user.wa_id}")
        await WhatsappBot.execute_workflow(msg, message_type="video")
        
        Logger.info(f"Successfully processed video message from {msg.from_user.wa_id}")
        return True

    except Exception as e:
        Logger.error(f"Error processing video message: {e}")
        return False
