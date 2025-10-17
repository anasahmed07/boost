from typing import List, Optional
from pydantic import BaseModel, Field


class ReferredUserSchema(BaseModel):
    phone_number: str
    time_stamp: str
    campaign_id: str

class PointsSchema(BaseModel):
    campaign_id: str
    points: int = 0

class ReferralSchema(BaseModel):
    total_points: List[PointsSchema] = Field(default_factory=list)
    referrer_id: Optional[str] = None
    referrer_name: Optional[str] = None
    referrer_email: Optional[str] = None
    referrer_phone: Optional[str] = None
    referral_code: Optional[str] = None
    referred_users: List[ReferredUserSchema] = Field(default_factory=list)
