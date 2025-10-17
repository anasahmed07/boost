from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
import urllib.parse
from whatsapp_agent._debug import Logger
from whatsapp_agent.utils.config import Config

router = APIRouter(prefix="/ref", tags=["Referral"])

WHATSAPP_BUSINESS_NUMBER = "923378626678"
BASE_URL = Config.get("SERVER_BASE_URL")

@router.get("/{referral_info}")
async def redirect_to_whatsapp(referral_info: str):
    """
    Redirects to WhatsApp with the join/signup message.
    User clicks this link to join using someone's referral code.
    
    URL Format: /ref/{CAMPAIGN_CODE}-{REFERRAL_CODE}
    Example: /ref/AGSP-GOBCKX
    
    Flow:
    1. User clicks: https://api.boost-dashboard.com/ref/AGSP-GOBCKX
    2. Redirects to: WhatsApp with pre-filled message
    3. User sends message to WhatsApp bot
    4. Bot processes referral and gives user their own code
    """
    try:
        # Parse the referral info
        parts = referral_info.split('-')
        if len(parts) != 2:
            Logger.error(f"Invalid referral format: {referral_info}")
            raise HTTPException(status_code=400, detail="Invalid referral format. Expected: CAMP-REFCODE")
        
        campaign_code, referral_code = parts
        
        # Validate format (4 letters for campaign, 6 for referral)
        if len(campaign_code) != 4 or len(referral_code) != 6:
            Logger.error(f"Invalid code length: campaign={len(campaign_code)}, referral={len(referral_code)}")
            raise HTTPException(status_code=400, detail="Invalid code length")
        
        if not campaign_code.isalpha() or not referral_code.isalpha():
            Logger.error(f"Codes must be alphabetic: {campaign_code}-{referral_code}")
            raise HTTPException(status_code=400, detail="Codes must contain only letters")
        
        # Create the join message that will be sent to the bot
        message = (
            f"👋 Hi Boost Buddy!\n"
            f"I'd like to join the Lucky Draw Giveaway 🚀\n"
            f"I'm joining using this referral code: (Referral code: _{campaign_code}-{referral_code}_) 🎉\n"
            f"👉 Please generate a referral code for me so I can start inviting others!"
        )
        
        # URL encode the message - safe='' ensures all characters including emojis are properly encoded
        encoded_message = urllib.parse.quote(message, safe='')
        
        # Create WhatsApp link using the official API
        # This format is more reliable and works better across devices
        whatsapp_url = f"https://api.whatsapp.com/send/?phone={WHATSAPP_BUSINESS_NUMBER}&text={encoded_message}&type=phone_number&app_absent=0"
        
        # Log for analytics
        Logger.info(f"Join link clicked: Campaign={campaign_code}, Referral={referral_code}")
        
        # Redirect to WhatsApp
        return RedirectResponse(url=whatsapp_url, status_code=302)
        
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"Error in join redirect: {e}")
        raise HTTPException(status_code=500, detail="Failed to process referral link")


@router.get("/share/{referral_info}")
async def redirect_to_whatsapp_share(referral_info: str):
    """
    Redirects to WhatsApp share dialog with invitation message.
    User clicks this link to share their referral code with friends.
    
    URL Format: /ref/share/{CAMPAIGN_CODE}-{REFERRAL_CODE}
    Example: /ref/share/AGSP-GOBCKX
    
    Flow:
    1. User 1 gets their referral message with: https://api.boost-dashboard.com/ref/share/AGSP-GOBCKX
    2. User 1 clicks the share link
    3. Opens WhatsApp with invitation message containing the join link
    4. User 1 sends to friends
    5. Friends click the join link (/ref/AGSP-GOBCKX)
    """
    try:
        # Parse the referral info
        parts = referral_info.split('-')
        if len(parts) != 2:
            Logger.error(f"Invalid referral format: {referral_info}")
            raise HTTPException(status_code=400, detail="Invalid referral format. Expected: CAMP-REFCODE")
        
        campaign_code, referral_code = parts
        
        # Validate format
        if len(campaign_code) != 4 or len(referral_code) != 6:
            Logger.error(f"Invalid code length: campaign={len(campaign_code)}, referral={len(referral_code)}")
            raise HTTPException(status_code=400, detail="Invalid code length")
        
        if not campaign_code.isalpha() or not referral_code.isalpha():
            Logger.error(f"Codes must be alphabetic: {campaign_code}-{referral_code}")
            raise HTTPException(status_code=400, detail="Codes must contain only letters")
        
        # Generate the join link that will be embedded in the share message
        join_link = f"{BASE_URL}/ref/{campaign_code}-{referral_code}"
        
        # Create the shareable invitation message
        share_message = (
            f"Salam, my dear Friends & Family 🌸\n\n"
            f"Boost Lifestyle, one of Pakistan's leading tech brands, is holding a Lucky Draw Giveaway! 🎁\n"
            f"I've already joined - and I thought to share it with you too 😊\n\n"
            f"Simply click the link below to participate for free ⬇\n"
            f"Whether you win or not, there's nothing to lose — so why not try your luck? 🍀\n\n"
            f"👉 {join_link}"
        )
        
        # URL encode the message - safe='' ensures all characters including emojis are properly encoded
        encoded_message = urllib.parse.quote(share_message, safe='')
        
        # Create WhatsApp share link using the official API (no phone number = opens share dialog)
        whatsapp_share_url = f"https://api.whatsapp.com/send/?text={encoded_message}&type=phone_number&app_absent=0"
        
        # Log for analytics
        Logger.info(f"Share link clicked: Campaign={campaign_code}, Referral={referral_code}")
        
        # Redirect to WhatsApp share dialog
        return RedirectResponse(url=whatsapp_share_url, status_code=302)
        
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"Error in share redirect: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate share link")
