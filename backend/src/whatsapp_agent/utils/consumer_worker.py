# consumer_worker.py
from kafka import KafkaConsumer
import json
import asyncio
from pywa_async.types.templates import BodyText, URLButton, TemplateLanguage
from whatsapp_agent.utils.wa_instance import wa
from whatsapp_agent.database.campaign import CampaignDataBase

campaign_db = CampaignDataBase()

# Kafka Consumer
consumer = KafkaConsumer(
    "whatsapp-broadcasts",
    bootstrap_servers="localhost:9092",
    value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    group_id="whatsapp-workers"
)

async def process_message(data):
    campaign = campaign_db.get_campaign_by_id(data["campaign_id"])
    if not campaign:
        return

    campaign_prizes = "• " + " • ".join(p for p in campaign.prizes)

    try:
        await wa.send_template(
            to=data["phone_number"],
            name="refer_boost_buddy",
            language=TemplateLanguage.ENGLISH,
            params=[
                BodyText.params(
                    customer_name=data["customer_name"],
                    campaign_name=campaign.name,
                    campaign_prizes=campaign_prizes
                ),
                URLButton.params(
                    index=0,
                    url_variable=f"{campaign.id}-{data['referral_code']}"
                ),
            ]
        )
        print(f"✅ Sent to {data['phone_number']}")
    except Exception as e:
        print(f"❌ Failed for {data['phone_number']}: {e}")

async def consume_loop():
    for msg in consumer:
        data = msg.value
        await process_message(data)

if __name__ == "__main__":
    asyncio.run(consume_loop())
