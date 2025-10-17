from agents import function_tool, RunContextWrapper
from pywa_async.types import BusinessPhoneNumber
from whatsapp_agent.utils.referrals_handler import ReferralHandler
from whatsapp_agent.context.global_context import GlobalContext
from whatsapp_agent.utils.wa_instance import wa

referral_handler = ReferralHandler()

@function_tool(failure_error_function=None)
async def get_referral_link(wrapper: RunContextWrapper[GlobalContext], campaign_code: str) -> str:
   """Get referral link for a campaign."""
   DEFAULT_PHONE_NUMBER:BusinessPhoneNumber = await wa.get_business_phone_number()
   phone_number = DEFAULT_PHONE_NUMBER.display_phone_number[1:].replace(" ", "")
   referral_code = referral_handler.get_referral_code(
      global_context=wrapper.context,
      campaign_code=campaign_code,
   )
   return referral_handler._static_message(referral_code, campaign_code, DEFAULT_PHONE_NO=phone_number)