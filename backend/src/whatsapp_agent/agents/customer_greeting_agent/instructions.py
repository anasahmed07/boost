from agents import Agent, RunContextWrapper
from whatsapp_agent.context.global_context import GlobalContext
from whatsapp_agent.database.boost_buddy_persona import PersonaDB
from whatsapp_agent.utils.current_time import _get_current_karachi_time_str

BASE_INSTRUCTIONS = """
{persona}

## Context Provided
```
<<<CHAT_HISTORY>>>
{messages}
<<<END_CHAT_HISTORY>>>
```

---
```
<<<CUSTOMER_CONTEXT>>>
{customer_context}
<<<END_CUSTOMER_CONTEXT>>>
```

---
```
Current Time:
{current_time}
```
"""


async def dynamic_instructions(wrapper: RunContextWrapper[GlobalContext], agent: Agent) -> str:
  db = PersonaDB()
  persona = db.get_persona("customer_greeting_agent")
  current_time = _get_current_karachi_time_str()
  return BASE_INSTRUCTIONS.format(
    persona=persona,
    messages=wrapper.context.messages.formatted_message,
    current_time=current_time,
    customer_context=wrapper.context.customer_context.formatted_context,
  )