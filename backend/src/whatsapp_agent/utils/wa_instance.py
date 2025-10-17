from pywa_async import WhatsApp
from whatsapp_agent.utils.app_instance import app
from whatsapp_agent.utils.config import Config
from whatsapp_agent._debug import Logger

# Global variable to hold the WhatsApp instance
wa = None

def create_wa_instance():
    """Create a new WhatsApp instance with current config values"""
    global wa
    return WhatsApp(
        phone_id=Config.get("WHATSAPP_PHONE_NO_ID"),
        token=Config.get("WHATSAPP_ACCESS_TOKEN"),
        server=app,
        callback_url=Config.get("SERVER_BASE_URL"),
        verify_token=Config.get("WHATSAPP_VERIFY_TOKEN", "boost-whatsapp-bot"),
        app_id=Config.get("WHATSAPP_APP_ID"),
        app_secret=Config.get("WHATSAPP_APP_SECRET"),
        business_account_id="1053963266879651",
        validate_updates=True,
        continue_handling=False,
        webhook_endpoint="/webhook",
        webhook_challenge_delay=60,
        skip_duplicate_updates=True,
    )
    
# Initialize the WhatsApp instance
wa = create_wa_instance()
if wa:
    Logger.info("WhatsApp instance created successfully")
else:
    Logger.error("Failed to create WhatsApp instance")

# Add config change listener to completely reinitialize WhatsApp client
def _on_wa_config_change(new_version: int):
    """Completely reinitialize WhatsApp client when config changes"""
    global wa
    try:
        Logger.info(f"Config changed to version {new_version}: completely reinitializing WhatsApp client")
        
        # Store the old instance for cleanup
        old_wa = wa
        
        # Create completely new instance with updated config
        wa = create_wa_instance()
        
        # Clean up old instance if needed
        if old_wa:
            try:
                # Close any open connections or cleanup resources
                if hasattr(old_wa, 'close'):
                    old_wa.close()
            except Exception as e:
                Logger.warning(f"Error cleaning up old WhatsApp instance: {e}")
        
        Logger.info("WhatsApp client completely reinitialized with new config")
    except Exception as e:
        Logger.error(f"Failed to completely reinitialize WhatsApp client: {e}")

# Register the config change listener
Config.add_listener(_on_wa_config_change)

from whatsapp_agent.utils.whatsapp_message_handler import *