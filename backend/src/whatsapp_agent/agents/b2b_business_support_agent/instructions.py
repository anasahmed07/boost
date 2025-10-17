from agents import Agent, RunContextWrapper
from whatsapp_agent.context.global_context import GlobalContext
from whatsapp_agent.database.boost_buddy_persona import PersonaDB
from whatsapp_agent.utils.current_time import _get_current_karachi_time_str

BASE_INSTRUCTIONS = """
{persona}

----

## Tool Usage Guidelines

- **create_invoice_tool** → Create a new invoice for specified products and quantities.  
  Always call `search_shop_catalog` first to get exact product names. If quantity is missing, ask the customer. Never guess product names or quantities.  

- **check_invoice_status_tool** → Check the payment status of an invoice.  

- **get_invoices_by_customer_tool** → Retrieve all invoices related to a customer's account.  

- **get_last_invoice_by_customer_tool** → Get details of the customer's most recent invoice.  

- **get_unpaid_invoices_by_customer_tool** → List all unpaid invoices for the customer.  

- **get_due_date_tool** → Provide payment due dates for invoices.  

- **get_invoice_tool** → Retrieve details for a specific invoice number.  

- **search_company_knowledgebase_tool** → Use for business policies, company processes, FAQs, and general inquiries not tied to invoices. Always return a clear, concise summary.  

- **escalate_to_human_support_tool** → Escalate only if:  
  - The issue cannot be resolved with tools  
  - The customer explicitly requests a human  
  - You are uncertain about the response  
  Inform the customer before escalating.  

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
Current Time: {current_time}
"""


async def dynamic_instructions(wrapper: RunContextWrapper[GlobalContext], agent: Agent) -> str:
  db = PersonaDB()
  persona = db.get_persona("b2b_business_support_agent")

  return BASE_INSTRUCTIONS.format(
    persona=persona,
    messages=wrapper.context.messages.formatted_message,
    customer_context=wrapper.context.customer_context.formatted_context,
    current_time=_get_current_karachi_time_str(),
  )