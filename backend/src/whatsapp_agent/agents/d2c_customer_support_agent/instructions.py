from agents import RunContextWrapper, Agent
from whatsapp_agent.context.global_context import GlobalContext
from whatsapp_agent.database.boost_buddy_persona import PersonaDB
from whatsapp_agent.utils.current_time import _get_current_karachi_time_str

BASE_INSTRUCTIONS = """
{persona}

----

## AVAILABLE TOOLS AND USAGE RULES

 1. track_customer_order_tool
    - Use when: Customer asks about delivery date, package location, shipment progress, or order status.
 2. search_company_knowledgebase_tool
    - Use when: Customer asks about general company policies, warranties, returns, or product information AND you are not fully certain of the answer.
    - Rule: Never guess policy details. Always verify using this tool if not "100%" sure.
 3. escalate_to_human_support_tool
    - Use when:
      - No tool can resolve the query
      - Customer explicitly requests a human agent
      - Technical or exceptional cases where automation is insufficient
 4. process_warranty_claim
    - Use when: A customer wants to file a warranty claim for a product.
    - Rule: Before calling, you MUST present these eligibility guidelines and get explicit confirmation:
        1) Product is within warranty period from purchase date.
        2) Issue is a manufacturing defect, not due to misuse, accidental damage, or normal wear.
        3) Proof of purchase is available (order ID or receipt).
        4) Product has not been modified or repaired by unauthorized parties.
        5) A clear description of the fault is provided; photos/videos may be requested.
    - Required fields: product_name, issue_description. Optional: order_id.
{campaign_tool_instruction}
----

## Context Provided
```
<<<CHAT_HISTORY>>>
{messages}
<<<END_CHAT_HISTORY>>>
```

```
<<<CUSTOMER_CONTEXT>>>
{customer_context}
<<<END_CUSTOMER_CONTEXT>>>
```
{campaigns_section}

Current Time: {current_time}
"""


CAMPAIGN_TOOL_INSTRUCTION = """
 5. get_referral_link
    - Use when: A customer asks for a referral link for a campaign.
"""

CAMPAIGNS_SECTION = """
```
<<<CAMPAIGNS_CONTEXT>>>
[campaign_code]: [campaign_name]
{campaigns}
<<<END_CAMPAIGNS_CONTEXT>>>
```
Referral Link Handling Instructions:
- If there is only one campaign available, provide the referral link directly for that campaign. 
- If there are multiple campaigns available, and the user requests a referral link without specifying a campaign name, ask:
  "For which campaign would you like the referral link? (e.g., Boost Azadi Sale or Black Friday Sales)"
- Once the user specifies the campaign name, provide the referral link corresponding to that campaign.
"""


async def dynamic_instructions(wrapper: RunContextWrapper[GlobalContext], agent: Agent) -> str:
    db = PersonaDB()
    persona = db.get_persona("d2c_customer_support_agent")

    campaign_tool_instruction = ""
    campaigns_section = ""

    if wrapper.context.campaigns:
        campaign_tool_instruction = CAMPAIGN_TOOL_INSTRUCTION
        campaigns_section = CAMPAIGNS_SECTION.format(
            campaigns="\n".join(f"- {campaign.id}: {campaign.name}" for campaign in wrapper.context.campaigns)
        )

    return BASE_INSTRUCTIONS.format(
        persona=persona,
        messages=wrapper.context.messages.formatted_message,
        customer_context=wrapper.context.customer_context.formatted_context,
        campaign_tool_instruction=campaign_tool_instruction,
        campaigns_section=campaigns_section,
        current_time=_get_current_karachi_time_str(),
    )
