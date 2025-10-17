import re
import random
import string
from pydantic import ValidationError
from typing import Optional
from fastapi import HTTPException
from whatsapp_agent.database.referral import ReferralDataBase
from whatsapp_agent.database.campaign import CampaignDataBase
from whatsapp_agent.schema.referrals import ReferralSchema, ReferredUserSchema, PointsSchema
from pywa_async.types.templates import BodyText, TemplateLanguage
from whatsapp_agent.schema.customer_schema import CustomerSchema
from whatsapp_agent.context.global_context import GlobalContext
from whatsapp_agent.utils.wa_instance import wa
from pywa_async.types import BusinessPhoneNumber
from whatsapp_agent.utils.current_time import _get_current_karachi_time_str
from whatsapp_agent.utils.campaign_handler import CampaignHandler
from whatsapp_agent._debug import Logger
from whatsapp_agent.utils.config import Config

referral_db = ReferralDataBase()

class ReferralHandler:
    BASE_URL = Config.get("SERVER_BASE_URL")
    
    @staticmethod
    def _extract_codes(message: str) -> tuple[Optional[str], Optional[str]]:
        """
        Extracts campaign code and referral code from a message.
        Expected format: (Referral code: _ABCD-ABCDEF_)
        Returns (campaign_code, referral_code) or (None, None).
        """
        try:
            pattern = r"\(Referral code:\s*_([A-Z]{4})-([A-Z]{6})_\)"
            match = re.search(pattern, message)
            if match:
                return match.group(1), match.group(2)
            return None, None
        except Exception as e:
            Logger.error(f"{__name__}: _extract_codes -> Failed to extract codes: {e}")
            return None, None

    def _check_existing_referral(self, phone_number: str, referral_code: str, campaign_code: str) -> bool:
        """
        Checks if the phone number already exists in referred_users
        for the given referral code.
        """
        try:
            referral = referral_db.get_referral_by_code(referral_code)
            Logger.info(f"_check_existing_referral: referral data: {referral}")

            if not referral:
                return True  # Possibly treat as already existing or invalid code

            for user in referral.get('referred_users', []):
                if ((user.get('phone_number', None) == phone_number) and
                (user.get('campaign_id', None) == campaign_code)):
                    return True
            return False

        except ValidationError as e:
            Logger.error(f"{__name__}: _check_existing_referral -> Referral data invalid in DB: {e.json()}")
            return True
        except Exception as e:
            Logger.error(f"{__name__}: _check_existing_referral -> Unexpected error: {e}")
            return True

    @staticmethod
    def _generate_referral_code(length: int = 6) -> str:
        """Generates a random uppercase referral code."""
        try:
            return ''.join(random.choice(string.ascii_uppercase) for _ in range(length))
        except Exception as e:
            Logger.error(f"{__name__}: _generate_referral_code -> Error generating code: {e}")
            return "ERROR"

    def _add_user_to_referral(self, phone_number: str, referral_code: str, campaign_code: str):
        """
        Adds a user to the referral list.
        """
        try:
            referral_db.add_referred_user(referral_code, ReferredUserSchema(
                phone_number=phone_number,
                time_stamp=_get_current_karachi_time_str(),
                campaign_id=campaign_code
            ))
            Logger.info(f"User {phone_number} added to referral {referral_code}")
        except ValidationError as e:
            Logger.error(f"{__name__}: _add_user_to_referral -> Validation error adding referred user: {e.json()}")
        except Exception as e:
            Logger.error(f"{__name__}: _add_user_to_referral -> Error adding user to referral: {e}")

    async def _increment_referral_count(self, referral_code: str, phone_number: str, campaign_code: str, send_message: bool = False) -> None:
        """
        Increments the referral count for a given referral code.
        """
        try:
            self._add_user_to_referral(phone_number, referral_code, campaign_code)
            referral = referral_db.get_referral_by_code(referral_code)

            if not referral:
                Logger.error(f"{__name__}: _increment_referral_count -> Referral not found for code {referral_code}")
                return

            referral_db.update_referral(referral_code, campaign_code)  # Increment
            campaign_db = CampaignDataBase()
            campaign = campaign_db.get_campaign_by_id(campaign_code)
            if send_message and referral.get("referrer_phone"):
                await wa.send_template(
                    to=referral["referrer_phone"],
                    name="referal_point_increment_update",
                    language=TemplateLanguage.ENGLISH,
                    params=[
                        BodyText.params(campaign_name=campaign.name),
                    ],
                )
        except Exception as e:
            Logger.error(f"{__name__}: _increment_referral_count -> Error incrementing referral count: {e}")

    @staticmethod
    def _check_campaign_status(campaign_code: str) -> bool:
        """
        Checks if a campaign exists.
        """
        try:
            campaign = CampaignHandler()
            return campaign.check_campaign_status(campaign_code)
        except Exception as e:
            Logger.error(f"{__name__}: _check_campaign_status -> Error checking campaign status: {e}")
            return False

    async def referral_workflow(self, user_message: str, phone_number: str, global_context: Optional[GlobalContext] = None):
        """
        Main workflow for handling referrals.
        """
        try:
            campaign_code, referral_code = self._extract_codes(user_message)
            Logger.info(f"Extracted campaign code: {campaign_code}, referral code: {referral_code}")

            if not campaign_code:
                Logger.warning("Invalid or missing campaign code.")

            if not self._check_campaign_status(campaign_code):
                Logger.warning("Campaign not active or invalid.")
                
            if not referral_code:
                Logger.warning("Invalid or missing referral code.")

            if self._check_existing_referral(phone_number, referral_code, campaign_code):
                Logger.warning("This user has already been referred with this code.")
            else:
                # Increment referral count for the referrer
                await self._increment_referral_count(referral_code, phone_number, campaign_code, send_message=True)

            # Check if referral exists for the phone number
            referral = referral_db.get_referral_by_phone_number(phone_number)
            DEFAULT_PHONE_NUMBER: BusinessPhoneNumber = await wa.get_business_phone_number()
            if not DEFAULT_PHONE_NUMBER or not DEFAULT_PHONE_NUMBER.display_phone_number:
                raise HTTPException(status_code=500, detail="Unable to get business phone number")
            d_phone_number = DEFAULT_PHONE_NUMBER.display_phone_number[1:].replace(" ", "")

            if not referral:
                # Generate new referral code for this user
                new_referral_code = self._generate_referral_code()
                if new_referral_code == "ERROR":
                    Logger.error(f"{__name__}: referral_workflow -> Error generating referral code, please try again later.")

                try:
                    total_points = [PointsSchema(campaign_id=campaign_code, points=0)]
                    new_referral = ReferralSchema(
                        total_points=total_points,
                        referrer_id=phone_number,
                        referrer_name=global_context.customer_context.customer_name if global_context else "",
                        referrer_email=global_context.customer_context.email if global_context else "",
                        referrer_phone=phone_number,
                        referral_code=new_referral_code,
                        referred_users=[],
                    )
                except ValidationError as e:
                    Logger.error(f"{__name__}: referral_workflow -> New referral data invalid: {e.json()}")

                # Save to DB
                try:
                    referral_db.add_referral(new_referral)
                except Exception as e:
                    Logger.error(f"{__name__}: referral_workflow -> Failed to add new referral: {e}")

                return self._static_message(new_referral_code, campaign_code, d_phone_number)

            return self._static_message(referral['referral_code'], campaign_code, d_phone_number)

        except Exception as e:
            Logger.error(f"{__name__}: referral_workflow -> Unexpected error: {e}")

    def _static_message(self, referral_code: str, campaign_code: str, DEFAULT_PHONE_NO: str) -> str:
        """
        Generates a friendly and engaging static message for the referral.
        """
        # Generate short share link using your backend route
        share_link = self._generate_share_link(
            campaign_code=campaign_code,
            referral_code=referral_code
        )
        
        return (
            f"""🎉 *Thank you for Joining the Lucky Draw Giveaway* 🎉\n\nBelow is a little Cheat Code just for you 😉\n\nBy clicking the link below, you can invite your Friends & Family on WhatsApp.\nEach person who joins the Lucky Draw using your special link will earn you *1 point* 🔗\n\nThe more people join, the more points you collect… and the greater your chances of winning amazing prizes! 🏆\n\n🔑 {share_link}"""
        )

    @staticmethod
    def _generate_share_link(campaign_code: str, referral_code: str) -> str:
        """
        Generates a short share link that opens WhatsApp share dialog.
        """
        return f"{ReferralHandler.BASE_URL}/ref/share/{campaign_code}-{referral_code}"
    
    @staticmethod
    def _generate_join_link(campaign_code: str, referral_code: str) -> str:
        """
        Generates a short join link that redirects to WhatsApp with pre-filled message.
        """
        return f"{ReferralHandler.BASE_URL}/ref/{campaign_code}-{referral_code}"

    def get_referral_code(self, global_context: GlobalContext, campaign_code: str):
        phone_number = global_context.customer_context.phone_number if global_context else ""
        referral = referral_db.get_referral_by_phone_number(phone_number)
        if not referral:
            total_points = [PointsSchema(campaign_id=campaign_code, points=0)]
            referral = referral_db.add_referral(
                ReferralSchema(
                    total_points=total_points,
                    referrer_id=phone_number,
                    referrer_name=global_context.customer_context.customer_name if global_context else "",
                    referrer_email=global_context.customer_context.email if global_context else "",
                    referrer_phone=phone_number,
                    referral_code=self._generate_referral_code(),
                    referred_users=[],
                )
            )

        return referral['referral_code']
    
    def check_or_create_referral(self, customer: CustomerSchema):
        phone_number = customer.phone_number
        referral = referral_db.get_referral_by_phone_number(phone_number)
        if not referral:
            Logger.warning("No existing referral found, creating new one.")
            referral = referral_db.add_referral(
                ReferralSchema(
                    total_points=[],
                    referrer_id=phone_number,
                    referrer_name=customer.customer_name if customer.customer_name else "",
                    referrer_email=customer.email if customer.email else "",
                    referrer_phone=phone_number,
                    referral_code=self._generate_referral_code(),
                    referred_users=[],
                )
            )
            Logger.info("New referral generated.")

    def get_or_create_referral(self, phone_number: str):
        referral = referral_db.get_referral_by_phone_number(phone_number)
        if not referral:
            Logger.warning("No existing referral found, creating new one.")
            referral = referral_db.add_referral(
                ReferralSchema(
                    total_points=[],
                    referrer_id=phone_number,
                    referrer_name="",
                    referrer_email="",
                    referrer_phone=phone_number,
                    referral_code=self._generate_referral_code(),
                    referred_users=[],
                )
            )
            Logger.info("New referral generated.")
            
        return referral