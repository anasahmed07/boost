from typing import List
import asyncio
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from pywa_async.types.templates import BodyText, URLButton, TemplateLanguage
from whatsapp_agent.database.customer import CustomerDataBase
from whatsapp_agent.database.campaign import CampaignDataBase
from whatsapp_agent.database.referral import ReferralDataBase
from whatsapp_agent.utils.wa_instance import wa
from whatsapp_agent.bot.whatsapp_bot import WhatsappBot

broadcast_router = APIRouter()

customer_db = CustomerDataBase()
campaign_db = CampaignDataBase()
referral_db = ReferralDataBase()


# ✅ Request models with validation
class Customer(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=15, description="Customer phone number in international format")
    customer_name: str = Field(..., min_length=1, description="Full name of the customer")


class BroadcastRequest(BaseModel):
    customers: List[Customer] = Field(..., min_items=1, description="List of customers to send broadcast")
    campaign_id: str = Field(..., min_length=1, description="Campaign ID")

async def _send_and_save_template(
    phone_number: str,
    customer_name: str,
    campaign_prizes: str,
    formatted_date: str,
    campaign_id: str,
    referral_code: str
):
    """Send template message and save it to chat history."""
    # Format the complete template message
    template_message = f"""Win Exciting Prizes

Dear *{customer_name}*, 🎉

Exciting news! ✨

*Boost Lifestyle* is hosting a *Lucky Draw Giveaway!* 🎁
We're giving away *{campaign_prizes}* 

The draw will be held on *{formatted_date}*.

If you *Win*, I'll personally take your address and ship your *Gift Prize* to you absolutely free! 🚚💨

Would you like to participate?

Boost - Up Your Lifestyle"""

    # Send the template message
    await wa.send_template(
        to=phone_number,
        name="luckydraw_referral",
        language=TemplateLanguage.ENGLISH,
        params=[
            BodyText.params(
                customer_name=customer_name,
                campaign_prizes=campaign_prizes,
                date=formatted_date
            ),
            URLButton.params(
                index=0,
                url_variable=f"{campaign_id}-{referral_code}"
            ),
        ]
    )

    # Save the message to chat history
    WhatsappBot._save_agent_message(phone_number, template_message)


@broadcast_router.post("/broadcasts")
async def create_broadcast(data: BroadcastRequest):
    # ✅ Validate campaign exists
    campaign = campaign_db.get_campaign_by_id(data.campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign_prizes = "• " + " • ".join(p for p in campaign.prizes)

    tasks = []

    # ✅ Iterate over customers
    for customer in data.customers:
        referral = referral_db.get_referral_by_phone_number(customer.phone_number)
        if not referral:
            # Skip instead of failing the whole batch
            continue  

        # ✅ Schedule WhatsApp message (non-blocking)
        formatted_date = datetime.strptime(campaign.end_date.split('T')[0], '%Y-%m-%d').strftime('%d-%m-%Y') if isinstance(campaign.end_date, str) else campaign.end_date.strftime("%d-%m-%Y")
        
        # Create an async task that sends template and saves message
        task = asyncio.create_task(
            _send_and_save_template(
                phone_number=customer.phone_number,
                customer_name=customer.customer_name,
                campaign_prizes=campaign_prizes,
                formatted_date=formatted_date,
                campaign_id=campaign.id,
                referral_code=referral['referral_code']
            )
        )
        tasks.append(task)

    # ✅ Run all tasks concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Count successes and failures
    success_count = sum(1 for r in results if not isinstance(r, Exception))
    failed_count = sum(1 for r in results if isinstance(r, Exception))

    return {
        "status": "completed",
        "success": success_count,
        "failed": failed_count,
        "message": f"Broadcast attempted for {len(data.customers)} customers"
    }
