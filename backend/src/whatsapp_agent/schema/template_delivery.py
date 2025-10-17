from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class DeliveryStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SENT = "sent"
    FAILED = "failed"
    DELIVERED = "delivered"
    READ = "read"

class TemplateDeliverySchema(BaseModel):
    id: str
    template_id: str
    template_name: str
    campaign_id: Optional[str] = None
    phone_number: str
    status: DeliveryStatus
    error_message: Optional[str] = None
    whatsapp_message_id: Optional[str] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class BulkDeliveryJobSchema(BaseModel):
    id: str
    template_id: str
    template_name: str
    campaign_id: Optional[str] = None
    total_recipients: int
    successful_sends: int = 0
    failed_sends: int = 0
    status: DeliveryStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

class DeliveryStatsResponse(BaseModel):
    job_id: str
    template_id: str
    template_name: str
    campaign_id: Optional[str] = None
    status: DeliveryStatus
    total_recipients: int
    successful_sends: int
    failed_sends: int
    pending_sends: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    delivery_details: List[TemplateDeliverySchema] = []

class BulkDeliveryResponse(BaseModel):
    job_id: str
    status: DeliveryStatus
    message: str
    template_id: str
    template_name: str
    total_recipients: int
    estimated_completion_time: Optional[str] = None
