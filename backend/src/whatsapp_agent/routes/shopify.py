from fastapi import APIRouter, Request, Header, HTTPException
from pywa_async.types.templates import BodyText, URLButton, TemplateLanguage, HeaderImage
from whatsapp_agent.shopify.base import ShopifyBase
from whatsapp_agent.utils.config import Config
from whatsapp_agent.utils.wa_instance import wa
from whatsapp_agent._debug import Logger
from whatsapp_agent.database.chat_history import ChatHistoryDataBase
from whatsapp_agent.schema.chat_history import MessageSchema
from datetime import datetime
import hmac
import hashlib
import base64

chat_db = ChatHistoryDataBase()

shopifyRouter = APIRouter(prefix="/shopify", tags=["shopify"])
shopifyBase = ShopifyBase()

SHOPIFY_WEBHOOK_ENCRYPTION_KEY = Config.get("SHOPIFY_WEBHOOK_ENCRYPTION_KEY", None)

def verify_webhook(data: bytes, hmac_header: str, secret: str) -> bool:
    """
    Verifies the Shopify webhook payload using the shared secret.
    :param data: The raw request body (bytes)
    :param hmac_header: The value of the X-Shopify-Hmac-Sha256 header
    :param secret: Your Shopify app's shared secret
    :return: True if valid, False otherwise
    """
    digest = hmac.new(secret.encode('utf-8'), data, hashlib.sha256).digest()
    computed_hmac = base64.b64encode(digest).decode()
    return hmac.compare_digest(computed_hmac, hmac_header)

@shopifyRouter.post("/webhook")
async def shopify_webhook(
    request: Request,
    x_shopify_hmac_sha256: str = Header(None)
    ):
    body = await request.body()
    if not verify_webhook(body, x_shopify_hmac_sha256, SHOPIFY_WEBHOOK_ENCRYPTION_KEY):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")
    payload = await request.json()

    customer = payload.get("customer", {})
    phone1 = customer.get("phone")
    default_address = customer.get("default_address", {})
    phone2 = default_address.get("phone")
    # Safely get phone numbers, skip None
    phone_numbers = []
    if phone1 and isinstance(phone1, str) and len(phone1) > 1:
        phone_numbers.append(phone1[1:])
    if phone2 and isinstance(phone2, str) and len(phone2) > 1:
        phone_numbers.append(phone2[1:])
    # Use first available phone number or fallback
    to_phone = phone_numbers[0] if phone_numbers else None
    customer_name = ((customer.get("first_name") or "") + " " + (customer.get("last_name") or "")).strip() or "Booster"
    line_items = ", ".join(item.get('name', '') for item in payload.get('line_items', []))

    if to_phone:
        await wa.send_template(
                to=to_phone,
                name="order_confirmation_by_ayesha",
                language=TemplateLanguage.ENGLISH,
                params=[
                    HeaderImage.params(
                        image="https://cdn.shopify.com/s/files/1/0688/4625/6375/files/New_Order_Confirmation_Image.jpg?v=1759169155",
                    ),
                    BodyText.params(
                        customer_name=customer_name,
                        order_number=payload.get("name"),
                        total_amount=payload.get("current_total_price"),
                        line_items=line_items
                    ),
                    URLButton.params(
                        index=0,
                        url_variable=f"{payload.get('id')}"
                    ),
                    URLButton.params(
                        index=1,
                        url_variable=f"{payload.get('id')}"
                    )
                ]
            )
        
        template_message = f"""Assalamu Alaikum Respected {customer_name},\n\nThank you for choosing Boost Lifestyle!\nWe're thrilled to have you on board. Your order is awaiting confirmation. Here are the details:\n\t•   Order Number: {payload.get("name")}\n\t•   Total Amount: PKR {payload.get("current_total_price")}\n\t•   Items: {line_items}\n\n✅ Please confirm or cancel your order by clicking the buttons below.\n\nYour satisfaction is our priority. I'll be available for you 24/7."""
        
        content_text = f"![{template_message}](https://cdn.shopify.com/s/files/1/0688/4625/6375/files/New_Order_Confirmation_Image.jpg?v=1759169155)"
        message = MessageSchema(
            time_stamp=datetime.now(),
            content=content_text,
            message_type="image",
            sender="agent"
        )
        chat_db.add_or_create_message(to_phone, message)
        Logger.info(f"Sent order confirmation template to {to_phone}")
    else:
        Logger.info("No valid phone number found for WhatsApp notification.")

        return {"success": True}



@shopifyRouter.post("/webhook/fulfilment")
async def fulfilment_webhook(
    request: Request,
    x_shopify_hmac_sha256: str = Header(None)
    ):
    body = await request.body()
    if not verify_webhook(body, x_shopify_hmac_sha256, SHOPIFY_WEBHOOK_ENCRYPTION_KEY):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")
    payload = await request.json()
    
    destination = payload.get("destination", {})
    phone = destination.get("phone")
    courier_name = "Postex" if payload.get("tracking_company") == "Other" else payload.get("tracking_company")
    tracking_no = payload.get("tracking_number")
    tracking_link = payload.get("tracking_url") or "https://www.postex.pk/tracking"
    customer_name = ((destination.get("first_name") or "") + " " + (destination.get("last_name") or "")).strip() or "Booster"
    if phone:
        await wa.send_template(
                to=phone,
                name="boost_fulfilment_created",
                language=TemplateLanguage.ENGLISH,
                params=[
                    HeaderImage.params(
                        image="https://cdn.shopify.com/s/files/1/0688/4625/6375/files/Order_Fullfilment_Image.jpg?v=1759169245",
                    ),
                    BodyText.params(
                        customer_name=customer_name,
                        courier_name=courier_name,
                        tracking_no=tracking_no,
                        tracking_link=tracking_link,
                    )
                ]
            )
        template_message = f"""Assalamu Alaikum Respected {customer_name},\nYour Order is on its way! 🛒\n\nCourier Name: {courier_name}\nTracking No: {tracking_no}\n\nYou can Track your order at: {tracking_link}\n\nIf you have any questions about your order, tracking updates, or need product support (like details or assembly videos), I'm here for you 24/7.\nYou can always reach out - our goal is to make your experience smooth and hassle-free."""

        content_text = f"![{template_message}](https://cdn.shopify.com/s/files/1/0688/4625/6375/files/Order_Fullfilment_Image.jpg?v=1759169245)"
        message = MessageSchema(
            time_stamp=datetime.now(),
            content=content_text,
            message_type="image",
            sender="agent"
        )
        chat_db.add_or_create_message(phone, message)
        Logger.info(f"Sent fulfillment template and saved agent message for {phone}")
    else:
        Logger.info("No valid phone number found for WhatsApp notification.")

        return {"success": True}

@shopifyRouter.get("/confirm-order/{order_no}")
async def confirm_order(order_no:str):
    from fastapi.responses import HTMLResponse
    from pywa_async.types import BusinessPhoneNumber
    Logger.info(f"Confirm order data:{order_no}")
    try:
        # Get business phone number for WhatsApp link
        DEFAULT_PHONE_NUMBER: BusinessPhoneNumber = await wa.get_business_phone_number()
        phone_number = DEFAULT_PHONE_NUMBER.display_phone_number[1:].replace(" ", "") if DEFAULT_PHONE_NUMBER else ""
        whatsapp_link = f"https://wa.me/{phone_number}" if phone_number else "#"
        
        shopifyBase.add_tags_to_order(order_no, ["Confirmed By Ayesha"])
        html_content = f"""
        <html>
        <head>
            <title>Order Confirmed - Boost Buddy</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }}
                .container {{ max-width: 380px; width: 100%; background: #fff; border-radius: 12px; border: 1px solid #e0e0e0; padding: 40px 32px; text-align: center; }}
                .success-icon {{ width: 64px; height: 64px; background: #FDB913; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 24px; }}
                h1 {{ color: #333; margin: 0 0 12px 0; font-size: 24px; font-weight: 600; }}
                .message {{ color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 16px; }}
                .order-number {{ color: #333; font-weight: 600; font-size: 16px; margin-bottom: 24px; }}
                .whatsapp-btn {{ display: block; width: 100%; background: #FDB913; color: #333; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; transition: all 0.2s ease; border: none; cursor: pointer; }}
                .whatsapp-btn:hover {{ background: #e5a510; }}
                .whatsapp-btn:active {{ transform: scale(0.98); }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="success-icon">✓</div>
                <h1>Order Confirmed</h1>
                <div class="message">
                    <p>Your order has been successfully confirmed.</p>
                </div>
                <div class="order-number">Order #{order_no}</div>
                <a href="{whatsapp_link}" class="whatsapp-btn">Return to WhatsApp</a>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=200)
    except Exception as e:
        Logger.error(f"Error confirming order:{e}")
        html_content = f"""
        <html>
        <head>
            <title>Error - Boost Buddy</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }}
                .container {{ max-width: 380px; width: 100%; background: #fff; border-radius: 12px; border: 1px solid #e0e0e0; padding: 40px 32px; text-align: center; }}
                .error-icon {{ width: 64px; height: 64px; background: #fee; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 24px; color: #dc2626; }}
                h1 {{ color: #333; margin: 0 0 12px 0; font-size: 24px; font-weight: 600; }}
                .message {{ color: #6b7280; font-size: 14px; line-height: 1.5; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-icon">✕</div>
                <h1>Error Confirming Order</h1>
                <div class="message">
                    <p>We encountered an issue while confirming your order. Please try again or contact support.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=500)

@shopifyRouter.get("/cancel-order/{order_no}")
async def cancel_order(order_no:str):
    from fastapi.responses import HTMLResponse
    from pywa_async.types import BusinessPhoneNumber
    Logger.info(f"Cancel order data:{order_no}")
    try:
        # Get business phone number for WhatsApp link
        DEFAULT_PHONE_NUMBER: BusinessPhoneNumber = await wa.get_business_phone_number()
        phone_number = DEFAULT_PHONE_NUMBER.display_phone_number[1:].replace(" ", "") if DEFAULT_PHONE_NUMBER else ""
        whatsapp_link = f"https://wa.me/{phone_number}" if phone_number else "#"
        
        shopifyBase.add_tags_to_order(order_no, ["Cancled By Ayesha"])
        html_content = f"""
        <html>
        <head>
            <title>Order Cancelled - Boost Buddy</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }}
                .container {{ max-width: 380px; width: 100%; background: #fff; border-radius: 12px; border: 1px solid #e0e0e0; padding: 40px 32px; text-align: center; }}
                .cancel-icon {{ width: 64px; height: 64px; background: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 24px; }}
                h1 {{ color: #333; margin: 0 0 12px 0; font-size: 24px; font-weight: 600; }}
                .message {{ color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 16px; }}
                .order-number {{ color: #333; font-weight: 600; font-size: 16px; margin-bottom: 24px; }}
                .whatsapp-btn {{ display: block; width: 100%; background: #FDB913; color: #333; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; transition: all 0.2s ease; border: none; cursor: pointer; }}
                .whatsapp-btn:hover {{ background: #e5a510; }}
                .whatsapp-btn:active {{ transform: scale(0.98); }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="cancel-icon">⚠</div>
                <h1>Order Cancelled</h1>
                <div class="message">
                    <p>Your order has been successfully cancelled.</p>
                </div>
                <div class="order-number">Order #{order_no}</div>
                <a href="{whatsapp_link}" class="whatsapp-btn">Return to WhatsApp</a>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=200)
    except Exception as e:
        Logger.error(f"Error cancelling order:{e}")
        html_content = f"""
        <html>
        <head>
            <title>Error - Boost Buddy</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }}
                .container {{ max-width: 380px; width: 100%; background: #fff; border-radius: 12px; border: 1px solid #e0e0e0; padding: 40px 32px; text-align: center; }}
                .error-icon {{ width: 64px; height: 64px; background: #fee; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 24px; color: #dc2626; }}
                h1 {{ color: #333; margin: 0 0 12px 0; font-size: 24px; font-weight: 600; }}
                .message {{ color: #6b7280; font-size: 14px; line-height: 1.5; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="error-icon">✕</div>
                <h1>Error Cancelling Order</h1>
                <div class="message">
                    <p>We encountered an issue while cancelling your order. Please try again or contact support.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=500)