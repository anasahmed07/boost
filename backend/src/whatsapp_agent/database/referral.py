from typing import List, Optional
from whatsapp_agent._debug import Logger
from whatsapp_agent.database.base import DataBase

from whatsapp_agent.schema.referrals import ReferralSchema, ReferredUserSchema

class ReferralDataBase(DataBase):
    def get_phone_number_by_referral_code(self, referral_code: str) -> Optional[str]:
        """Given a referral code, return the referrer's phone number if found, else None."""
        referral = self.get_referral_by_code(referral_code)
        if referral and 'referrer_phone' in referral:
            return referral['referrer_phone']
        return None
    def __init__(self):
        super().__init__()  # initialize supabase connection

    def add_referral(self, referral: ReferralSchema):
        """Insert a referral record into Supabase"""
        data = referral.dict()  # convert Pydantic model to dict
        response = self.supabase.table("referrals").insert(data).execute()
        return response.data[0] if response.data else None

    def get_referral_by_code(self, referral_code: str):
        """Fetch referral details from Supabase"""
        response = (
            self.supabase.table("referrals")
            .select("*")
            .eq("referral_code", referral_code)
            .execute()
        )

        return response.data[0] if response.data else None

    def get_referral_by_phone_number(self, phone_number: str):
        """Fetch referral details from Supabase by phone number"""
        response = (
            self.supabase.table("referrals")
            .select("*")
            .eq("referrer_phone", phone_number)
            .execute()
        )
        return response.data[0] if response.data else None

    def add_referred_user(self, referral_code: str, referred_user: ReferredUserSchema):
        """Add a referred user to an existing referral"""
        referral = self.get_referral_by_code(referral_code)
        referral.get("referred_users", []).append(referred_user.dict())
        response = (
            self.supabase.table("referrals")
            .update({"referred_users": referral.get("referred_users", [])})
            .eq("referral_code", referral_code)
            .execute()
        )
        return response.data[0] if response.data else None

    def update_referral(self, referral_code: str, campaign_id: str):
        """Update an existing referral"""
        referral = self.get_referral_by_code(referral_code)
        existance: bool = False
        if not referral:
            return None
        for point in referral['total_points']:
            if point['campaign_id'] == campaign_id:
                existance = True
                point['points'] += 1
                break

        if not existance:
            Logger.info("Adding new campaign points entry")
            referral['total_points'].append({"campaign_id": campaign_id, "points": 1})

        (self.supabase.table("referrals")
        .update({"total_points": referral.get("total_points", [])})
        .eq("referral_code", referral_code)
        .execute())

        return referral
