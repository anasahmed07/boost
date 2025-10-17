from agents import function_tool
from whatsapp_agent.database.customer import CustomerDataBase
from whatsapp_agent.database.escalation_stats import EscalationStatsDatabase

customer_db = CustomerDataBase()
escalation_stats_handler = EscalationStatsDatabase()

@function_tool
def escalate_to_human_support_tool(phone_number: str):
    is_updated = customer_db.update_escalation_status(phone_number, True)
    if is_updated:
        escalation_stats_handler.increment_escalation_count(customer_type="D2C")
    return {"status": "escalated"} if is_updated else {"status": "Sorry, we couldn't escalate your issue."}