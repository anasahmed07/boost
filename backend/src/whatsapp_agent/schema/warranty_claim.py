from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class WarrantyClaimSchema(BaseModel):
    id: Optional[str] = None
    customer_phone: str
    product_name: str
    issue_description: str
    order_id: Optional[str] = None
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = None
    status: str = "pending"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
