import re
from rich import print
from pywa_async.types.templates import BodyText, URLButton, HeaderText
from typing import Dict

class TemplateInspector:
    """
    A utility class to inspect WhatsApp templates, extract placeholders,
    restructure them into a usable format, update values, and generate Params objects.
    """

    targets = ["BodyText", "URLButton", "HeaderText"]

    def __init__(self, template):
        self.template = template
        self.placeholders = self._extract_placeholders_with_targets()
        self.structured = self._restructure_results()

    def _extract_placeholders_with_targets(self):
        results = []

        for comp in self.template.components:
            cls_name = comp.__class__.__name__

            for attr in dir(comp):
                if attr.startswith("_") or callable(getattr(comp, attr)):
                    continue

                value = getattr(comp, attr)
                if isinstance(value, str):
                    matches = re.findall(r"\{\{(.*?)\}\}", value)
                    for m in matches:
                        if cls_name in self.targets:
                            results.append({"key": m, "value": cls_name})

                elif isinstance(value, list):  # e.g. Buttons -> [URLButton]
                    for item in value:
                        item_cls = item.__class__.__name__
                        for sub_attr in dir(item):
                            if sub_attr.startswith("_") or callable(getattr(item, sub_attr)):
                                continue
                            sub_val = getattr(item, sub_attr)
                            if isinstance(sub_val, str):
                                matches = re.findall(r"\{\{(.*?)\}\}", sub_val)
                                for m in matches:
                                    if item_cls in self.targets:
                                        results.append({"key": m, "value": item_cls})
        return results

    def _restructure_results(self):
        structured = {}
        for placeholder in self.placeholders:  
            key = placeholder["key"]
            comp = placeholder["value"]
            structured.setdefault(comp, [])
            structured[comp].append({"key": key, "value": ""})
        return structured

    def fill_values(self, mapping: dict):
        """
        Update placeholder values using a mapping {placeholder_key: value}.
        This will fill all occurrences of a placeholder across all groups.
        """
        for comp, fields in self.structured.items():
            for field in fields:
                key = field["key"]
                if key in mapping:
                    field["value"] = mapping[key]


    def get_params(self):
        params = []
        for comp, fields in self.structured.items():
            if comp == "BodyText":
                params.append(BodyText.params(**{f["key"]: f["value"] for f in fields}))
            if comp == "URLButton":
                for f in fields:
                    params.append(URLButton.params(index=0, url_variable=f["value"]))
            if comp == "HeaderText":
                print({f["key"]: f["value"] for f in fields})
                params.append(HeaderText.params(**{f["key"]: f["value"] for f in fields}))
        return params

    def debug_params(self):
        """
        Show params in a human-readable dict format.
        """
        pretty = []
        for p in self.get_params():
            try:
                data = vars(p)
                if "named" in data:
                    pretty.append(data["named"])
                else:
                    pretty.append(data)
            except Exception:
                pretty.append(str(p))
        return pretty


    async def get_dynamic_data(self, dynamic: dict, phone_number: str, campaign_id: str = None) -> Dict[str, str]:
        data = dynamic.values()
        dynamic_data = {}
    
        if (
            "campaign_prizes" in data or 
            "campaign_name" in data or 
            "campaign_start_date" in data or 
            "campaign_end_date" in data or 
            "campaign_code" in data
        ):
            from whatsapp_agent.database.campaign import CampaignDataBase
            campaign_db = CampaignDataBase()
            campaign = campaign_db.get_campaign_by_id(campaign_id)
    
            if not campaign:
                raise ValueError("Invalid campaign ID")
    
            if "campaign_prizes" in data:
                dynamic_data["campaign_prizes"] = "• " + " • ".join(p for p in campaign.prizes)
            if "campaign_name" in data:
                dynamic_data["campaign_name"] = campaign.name
            if "campaign_start_date" in data:
                dynamic_data["campaign_start_date"] = campaign.start_date.strftime("%d %b %Y")
            if "campaign_end_date" in data:
                dynamic_data["campaign_end_date"] = campaign.end_date.strftime("%d %b %Y")
            
        if "customer_name" in data or "customer_email" in data:
            from whatsapp_agent.database.customer import CustomerDataBase
            customer_db = CustomerDataBase()
            customer = customer_db.get_customer_by_phone(phone_number)
    
            if not customer:
                raise ValueError(f"Customer with phone number {phone_number} not found")
    
            if "customer_name" in data:
                dynamic_data["customer_name"] = customer.customer_name or "Booster"
            if "customer_email" in data:
                dynamic_data["customer_email"] = customer.email or ""
    
        if "referral_code" in data:
            from whatsapp_agent.utils.referrals_handler import ReferralHandler
            referral_handler = ReferralHandler()
            referral = referral_handler.get_or_create_referral(phone_number)
    
            if not referral:
                raise ValueError(f"Referral for phone number {phone_number} not found")
    
            dynamic_data["referral_code"] = referral["referral_code"]
    
        if "codes" in data:
            from whatsapp_agent.database.campaign import CampaignDataBase
            from whatsapp_agent.utils.referrals_handler import ReferralHandler
            referral_handler = ReferralHandler()
            campaign_db = CampaignDataBase()
            c_code = campaign_db.get_campaign_by_id(campaign_id)
            r_code = referral_handler.get_or_create_referral(phone_number)
    
            if not c_code or not r_code:
                raise ValueError(f"No codes found for phone number {phone_number}")
    
            dynamic_data["codes"] = f"{c_code.id}-{r_code['referral_code']}"
    
        return {k: dynamic_data[v] for k, v in dynamic.items()}
