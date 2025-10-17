from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class WaitlistEntry(BaseModel):
    """Schema for waitlist entry."""
    
    id: Optional[str] = None
    product_id: str = Field(..., description="Product ID that is out of stock")
    customer_phone: str = Field(..., description="Customer's WhatsApp phone number")
    customer_name: Optional[str] = Field(None, description="Customer's name")
    created_at: Optional[datetime] = None
    notified: bool = Field(default=False, description="Whether customer has been notified when product is back in stock")
    
    class Config:
        json_schema_extra = {
            "example": {
                "product_id": "PROD123",
                "customer_phone": "+1234567890",
                "customer_name": "John Doe",
                "notified": False
            }
        }


class WaitlistAddRequest(BaseModel):
    """Schema for adding a customer to waitlist."""
    
    product_id: str = Field(..., description="Product ID that is out of stock")
    customer_phone: str = Field(..., description="Customer's WhatsApp phone number")
    customer_name: Optional[str] = Field(None, description="Customer's name")


class WaitlistResponse(BaseModel):
    """Schema for waitlist operation response."""
    
    success: bool
    message: str
    entry: Optional[WaitlistEntry] = None
