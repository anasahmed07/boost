import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
from whatsapp_agent.utils.wa_instance import wa
from whatsapp_agent.utils.template_handler import TemplateInspector
from whatsapp_agent.database.template_delivery import TemplateDeliveryDataBase
from whatsapp_agent.schema.template_delivery import DeliveryStatus
from whatsapp_agent._debug import Logger
from pywa.types.templates import TemplateLanguage

class TemplateDeliveryProcessor:
    def __init__(self):
        self.delivery_db = TemplateDeliveryDataBase()

    async def process_bulk_delivery(
        self, 
        job_id: str, 
        template_id: str, 
        template_name: str,
        recipients: List[str], 
        variables: List[Dict[str, Any]], 
        campaign_id: Optional[str] = None
    ) -> None:
        """
        Process bulk template delivery in the background
        """
        try:
            Logger.info(f"Starting bulk delivery job: {job_id}")
            
            # Get template and create inspector
            template = await wa.get_template(template_id=template_id)
            if not template:
                await self._mark_job_failed(job_id, f"Template {template_id} not found")
                return

            inspector = TemplateInspector(template)

            # Separate static and dynamic variables
            static, dynamic = {}, {}
            for variable in variables:
                if "$dynamic_" in variable.get("value", ""):
                    dynamic[variable["name"]] = variable["value"].replace("$dynamic_", "")
                else:
                    static[variable["name"]] = variable["value"]

            # Create delivery records for all recipients
            delivery_ids = []
            for phone_number in recipients:
                delivery_id = self.delivery_db.create_delivery_record(
                    job_id=job_id,
                    template_id=template_id,
                    template_name=template_name,
                    phone_number=phone_number,
                    campaign_id=campaign_id
                )
                delivery_ids.append((delivery_id, phone_number))

            # Process deliveries in batches to avoid overwhelming the API
            batch_size = 5  # Process 5 messages at a time
            successful_sends = 0
            failed_sends = 0

            for i in range(0, len(delivery_ids), batch_size):
                batch = delivery_ids[i:i + batch_size]
                
                # Process batch concurrently
                tasks = [
                    self._send_single_template(
                        delivery_id, phone_number, template, inspector, 
                        static, dynamic, campaign_id
                    )
                    for delivery_id, phone_number in batch
                ]
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Count results
                for result in results:
                    if isinstance(result, Exception):
                        failed_sends += 1
                        Logger.error(f"Batch processing error: {result}")
                    elif result:
                        successful_sends += 1
                    else:
                        failed_sends += 1

                # Update job stats
                self.delivery_db.update_bulk_job_stats(job_id, successful_sends, failed_sends)
                
                # Small delay between batches to avoid rate limiting
                if i + batch_size < len(delivery_ids):
                    await asyncio.sleep(1)

            # Mark job as completed
            final_status = DeliveryStatus.SENT if failed_sends == 0 else DeliveryStatus.SENT
            self.delivery_db.update_bulk_job_status(job_id, final_status)
            
            Logger.info(f"Completed bulk delivery job: {job_id} - Success: {successful_sends}, Failed: {failed_sends}")

        except Exception as e:
            Logger.error(f"Bulk delivery job {job_id} failed: {str(e)}")
            await self._mark_job_failed(job_id, str(e))

    async def _send_single_template(
        self, 
        delivery_id: str, 
        phone_number: str, 
        template, 
        inspector: TemplateInspector,
        static: Dict[str, Any], 
        dynamic: Dict[str, Any], 
        campaign_id: Optional[str]
    ) -> bool:
        """
        Send a single template message and update delivery status
        """
        try:
            # Update status to processing
            self.delivery_db.update_delivery_status(delivery_id, DeliveryStatus.PROCESSING)

            # Get dynamic data for this recipient
            dynamic_data = await inspector.get_dynamic_data(dynamic, phone_number, campaign_id)
            final_data = {**static, **dynamic_data}
            inspector.fill_values(final_data)

            # Send template message
            result = await wa.send_template(
                to=phone_number,
                name=template.name,
                language=template.language,
                params=inspector.get_params()
            )

            if result:
                # Extract WhatsApp message ID if available
                whatsapp_message_id = None
                if hasattr(result, 'id'):
                    whatsapp_message_id = result.id
                elif isinstance(result, dict) and 'id' in result:
                    whatsapp_message_id = result['id']

                # Update delivery status to sent
                self.delivery_db.update_delivery_status(
                    delivery_id, 
                    DeliveryStatus.SENT, 
                    whatsapp_message_id=whatsapp_message_id
                )
                
                Logger.info(f"Successfully sent template to {phone_number}")
                return True
            else:
                # Update delivery status to failed
                self.delivery_db.update_delivery_status(
                    delivery_id, 
                    DeliveryStatus.FAILED, 
                    error_message="WhatsApp API returned false"
                )
                
                Logger.warning(f"Failed to send template to {phone_number}: WhatsApp API returned false")
                return False

        except Exception as e:
            # Update delivery status to failed
            self.delivery_db.update_delivery_status(
                delivery_id, 
                DeliveryStatus.FAILED, 
                error_message=str(e)
            )
            
            Logger.error(f"Failed to send template to {phone_number}: {str(e)}")
            return False

    async def _mark_job_failed(self, job_id: str, error_message: str) -> None:
        """Mark a bulk job as failed"""
        self.delivery_db.update_bulk_job_status(job_id, DeliveryStatus.FAILED, error_message)
        Logger.error(f"Bulk job {job_id} marked as failed: {error_message}")

    async def update_delivery_status_from_webhook(self, whatsapp_message_id: str, status: DeliveryStatus) -> bool:
        """
        Update delivery status from WhatsApp webhook
        """
        try:
            # Find delivery record by WhatsApp message ID
            response = (
                self.delivery_db.supabase
                .table(self.delivery_db.DELIVERY_TABLE)
                .select("*")
                .eq("whatsapp_message_id", whatsapp_message_id)
                .execute()
            )

            if response.data:
                delivery_record = response.data[0]
                delivery_id = delivery_record["id"]
                
                # Update status
                success = self.delivery_db.update_delivery_status(delivery_id, status)
                
                if success:
                    Logger.info(f"Updated delivery status for message {whatsapp_message_id}: {status}")
                
                return success
            else:
                Logger.warning(f"No delivery record found for WhatsApp message ID: {whatsapp_message_id}")
                return False

        except Exception as e:
            Logger.error(f"Failed to update delivery status from webhook: {str(e)}")
            return False
