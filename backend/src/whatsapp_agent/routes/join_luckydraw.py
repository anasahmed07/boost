from fastapi import APIRouter, Query, HTTPException
from pywa_async.types import BusinessPhoneNumber
from whatsapp_agent.utils.wa_instance import wa
from whatsapp_agent.utils.referrals_handler import ReferralHandler
from whatsapp_agent.bot.whatsapp_bot import WhatsappBot
from whatsapp_agent._debug import Logger
import re

join_luckydraw_router = APIRouter()
wa_func_class =WhatsappBot()

@join_luckydraw_router.get("/join-luckydraw")
async def join_lucky_draw_giveaway(
    codes: str = Query(..., description="Campaign and referral codes in format: CAMPAIGN-REFERRAL", min_length=3, max_length=20),
):
    """
    Redirects users to WhatsApp with a prefilled message including campaignId and referralCode.
    
    - **codes**: Campaign and referral codes in format "CAMPAIGN-REFERRAL" (e.g., "ABCD-ABCDEF")
    """
    try:
        # Validate input format
        if not codes or not isinstance(codes, str):
            raise HTTPException(status_code=400, detail="Invalid codes parameter")
        
        # Check if codes contain exactly one dash
        if codes.count("-") != 1:
            raise HTTPException(status_code=400, detail="Codes must be in format: CAMPAIGN-REFERRAL")
        
        # Split and validate codes
        parts = codes.strip().split("-")
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid codes format")
        
        campaign_code, referral_code = parts
        
        # Validate code formats
        if not re.match(r'^[A-Z]{4}$', campaign_code):
            raise HTTPException(status_code=400, detail="Campaign code must be 4 uppercase letters")
        
        if not re.match(r'^[A-Z]{6}$', referral_code):
            raise HTTPException(status_code=400, detail="Referral code must be 6 uppercase letters")
        
        # Get business phone number
        try:
            DEFAULT_PHONE_NUMBER: BusinessPhoneNumber = await wa.get_business_phone_number()
            if not DEFAULT_PHONE_NUMBER or not DEFAULT_PHONE_NUMBER.display_phone_number:
                raise HTTPException(status_code=500, detail="Unable to get business phone number")
        except Exception as e:
            Logger.error(f"Failed to get business phone number: {e}")
            raise HTTPException(status_code=500, detail="Unable to get business phone number")
        
        phone_number = DEFAULT_PHONE_NUMBER.display_phone_number[1:].replace(" ", "")
        handler = ReferralHandler()
        # Use the static message as in referral_link.py
        static_message = handler._static_message(referral_code, campaign_code, DEFAULT_PHONE_NO=phone_number)

        # Extract the user's WhatsApp number from the referral code using the database
        from whatsapp_agent.database.referral import ReferralDataBase
        referral_db = ReferralDataBase()
        user_phone_number = referral_db.get_phone_number_by_referral_code(referral_code)

        # If you can get the user's phone number, send the referral message
        try:
            if user_phone_number:
                await wa.send_message(user_phone_number, static_message)
                wa_func_class._save_agent_message(user_phone_number, static_message)
        except Exception as send_exc:
            Logger.error(f"Failed to send referral message to user: {send_exc}")

        # Create WhatsApp link
        whatsapp_link = f"https://wa.me/{phone_number}"
        
        # Render a simple HTML success page with a button to return to WhatsApp
        html_content = f"""
        <html>
        <head>
            <title>Boost Lifestyle</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }}
                .container {{ max-width: 380px; width: 100%; background: #fff; border-radius: 12px; border: 1px solid #e0e0e0; padding: 40px 32px; text-align: center; }}
                .success-icon {{ width: 64px; height: 64px; background: #FDB913; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 24px; }}
                h1 {{ color: #333; margin: 0 0 12px 0; font-size: 24px; font-weight: 600; }}
                .message {{ color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 32px; }}
                .whatsapp-btn {{ display: block; width: 100%; background: #FDB913; color: #333; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; transition: all 0.2s ease; border: none; cursor: pointer; }}
                .whatsapp-btn:hover {{ background: #e5a510; }}
                .whatsapp-btn:active {{ transform: scale(0.98); }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✓</div>
                <h1>Successfully Joined!</h1>
                <div class="message">
                    <p>Thank you for joining the Lucky Draw Giveaway. Your referral link has been sent to WhatsApp. Share With your Friends And Family To Get Points</p>
                </div>
                <a href="{whatsapp_link}" class="whatsapp-btn">
                    Return to WhatsApp
                </a>
            </div>
        </body>
        </html>
        """
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content, status_code=200)
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"Unexpected error in Join_Lucky_Draw: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")