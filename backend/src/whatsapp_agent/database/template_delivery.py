from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from whatsapp_agent.database.base import DataBase
from whatsapp_agent.schema.template_delivery import (
    TemplateDeliverySchema, 
    BulkDeliveryJobSchema, 
    DeliveryStatus
)
from whatsapp_agent._debug import Logger

class TemplateDeliveryDataBase(DataBase):
    DELIVERY_TABLE = "template_deliveries"
    BULK_JOBS_TABLE = "bulk_delivery_jobs"

    def __init__(self):
        super().__init__()

    # Bulk Job Operations
    def create_bulk_job(self, template_id: str, template_name: str, 
                       total_recipients: int, campaign_id: Optional[str] = None) -> str:
        """Create a new bulk delivery job and return the job ID"""
        job_id = str(uuid.uuid4())
        job_data = {
            "id": job_id,
            "template_id": template_id,
            "template_name": template_name,
            "campaign_id": campaign_id,
            "total_recipients": total_recipients,
            "successful_sends": 0,
            "failed_sends": 0,
            "status": DeliveryStatus.PROCESSING,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        response = self.supabase.table(self.BULK_JOBS_TABLE).insert(job_data).execute()
        Logger.info(f"Created bulk delivery job: {job_id}")
        return job_id

    def get_bulk_job(self, job_id: str) -> Optional[BulkDeliveryJobSchema]:
        """Get a bulk delivery job by ID"""
        response = (
            self.supabase.table(self.BULK_JOBS_TABLE)
            .select("*")
            .eq("id", job_id)
            .execute()
        )
        
        if response.data:
            return BulkDeliveryJobSchema(**response.data[0])
        return None

    def update_bulk_job_status(self, job_id: str, status: DeliveryStatus, error_message: Optional[str] = None) -> bool:
        """Update bulk job status"""
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if error_message:
            update_data["error_message"] = error_message
            
        if status in [DeliveryStatus.SENT, DeliveryStatus.FAILED]:
            update_data["completed_at"] = datetime.utcnow().isoformat()

        response = (
            self.supabase.table(self.BULK_JOBS_TABLE)
            .update(update_data)
            .eq("id", job_id)
            .execute()
        )
        
        return len(response.data) > 0

    def update_bulk_job_stats(self, job_id: str, successful_sends: int, failed_sends: int) -> bool:
        """Update bulk job statistics"""
        update_data = {
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
            "updated_at": datetime.utcnow().isoformat()
        }

        response = (
            self.supabase.table(self.BULK_JOBS_TABLE)
            .update(update_data)
            .eq("id", job_id)
            .execute()
        )
        
        return len(response.data) > 0

    # Individual Delivery Operations
    def create_delivery_record(self, job_id: str, template_id: str, template_name: str, phone_number: str, campaign_id: Optional[str] = None) -> str:
        """Create a delivery record for a single recipient"""
        delivery_id = str(uuid.uuid4())
        delivery_data = {
            "id": delivery_id,
            "job_id": job_id,
            "template_id": template_id,
            "template_name": template_name,
            "campaign_id": campaign_id,
            "phone_number": phone_number,
            "status": DeliveryStatus.PENDING,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        response = self.supabase.table(self.DELIVERY_TABLE).insert(delivery_data).execute()
        Logger.info(f"Created delivery record: {delivery_id} for {phone_number}")
        return delivery_id

    def update_delivery_status(
        self, delivery_id: str, status: DeliveryStatus,
        error_message: Optional[str] = None,
        whatsapp_message_id: Optional[str] = None) -> bool:
        """Update delivery status for a single recipient"""
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if error_message:
            update_data["error_message"] = error_message
            
        if whatsapp_message_id:
            update_data["whatsapp_message_id"] = whatsapp_message_id
            
        if status == DeliveryStatus.SENT:
            update_data["sent_at"] = datetime.utcnow().isoformat()
        elif status == DeliveryStatus.DELIVERED:
            update_data["delivered_at"] = datetime.utcnow().isoformat()
        elif status == DeliveryStatus.READ:
            update_data["read_at"] = datetime.utcnow().isoformat()

        response = (
            self.supabase.table(self.DELIVERY_TABLE)
            .update(update_data)
            .eq("id", delivery_id)
            .execute()
        )
        
        return len(response.data) > 0

    def get_delivery_records_by_job(self, job_id: str) -> List[TemplateDeliverySchema]:
        """Get all delivery records for a specific job"""
        response = (
            self.supabase.table(self.DELIVERY_TABLE)
            .select("*")
            .eq("job_id", job_id)
            .order("created_at", desc=False)
            .execute()
        )
        
        return [TemplateDeliverySchema(**record) for record in response.data or []]

    def get_delivery_stats_by_job(self, job_id: str) -> Dict[str, int]:
        """Get delivery statistics for a job"""
        response = (
            self.supabase.table(self.DELIVERY_TABLE)
            .select("status", count="exact")
            .eq("job_id", job_id)
            .execute()
        )
        
        stats = {
            "total": 0,
            "pending": 0,
            "processing": 0,
            "sent": 0,
            "failed": 0,
            "delivered": 0,
            "read": 0
        }
        
        if response.data:
            for record in response.data:
                status = record.get("status", "pending")
                count = record.get("count", 0)
                stats[status] = count
                stats["total"] += count
                
        return stats

    def get_recent_bulk_jobs(self, limit: int = 10) -> List[BulkDeliveryJobSchema]:
        """Get recent bulk delivery jobs"""
        response = (
            self.supabase.table(self.BULK_JOBS_TABLE)
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        
        return [BulkDeliveryJobSchema(**job) for job in response.data or []]

    def cleanup_old_records(self, days_old: int = 30) -> int:
        """Clean up old delivery records (optional maintenance)"""
        cutoff_date = datetime.utcnow().replace(day=datetime.utcnow().day - days_old)
        
        # Delete old delivery records
        delivery_response = (
            self.supabase.table(self.DELIVERY_TABLE)
            .delete()
            .lt("created_at", cutoff_date.isoformat())
            .execute()
        )
        
        # Delete old bulk jobs
        job_response = (
            self.supabase.table(self.BULK_JOBS_TABLE)
            .delete()
            .lt("created_at", cutoff_date.isoformat())
            .execute()
        )
        
        deleted_count = len(delivery_response.data or []) + len(job_response.data or [])
        Logger.info(f"Cleaned up {deleted_count} old delivery records")
        return deleted_count
