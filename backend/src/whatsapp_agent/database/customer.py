from typing import Optional, List, Dict, Any, cast
from whatsapp_agent._debug import Logger
from whatsapp_agent.database.base import DataBase 
from whatsapp_agent.schema.customer_schema import CustomerSchema

class CustomerDataBase(DataBase):
    TABLE_NAME = "customers"  # Make sure your Supabase table is named this

    def __init__(self):
        super().__init__()  # Calls DataBase constructor to connect

    def add_customer(self, customer: CustomerSchema) -> CustomerSchema:
        """Insert a new customer record."""
        data = customer.dict()
        response = self.supabase.table(self.TABLE_NAME).insert(data).execute()
        Logger.debug(f"Created new customer: {response.data[0]}")
        return cast(CustomerSchema, response.data[0])

    def get_customer_by_phone(self, phone_number: str) -> Optional[CustomerSchema]:
        """Fetch a customer by phone number."""
        response = self.supabase.table(self.TABLE_NAME) \
            .select("*") \
            .eq("phone_number", phone_number) \
            .limit(1) \
            .execute()
        
        if response.data:
            Logger.debug(f"Fetched customer by phone: {response.data}")
            return CustomerSchema.model_validate(response.data[0])
        return None

    def update_customer(self, phone_number: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update customer details."""
        # Validate and clean the updates
        clean_updates = {
            k: v for k, v in updates.items()
            if v not in (None, [], "")
        }
        # Remove escalation_status if it is not provided
        clean_updates.pop('escalation_status', None)
        response = self.supabase.table(self.TABLE_NAME) \
            .update(clean_updates) \
            .eq("phone_number", phone_number) \
            .execute()
        Logger.info(f"Updated customer details for phone: {phone_number}")
        return response.data

    def delete_customer(self, phone_number: str) -> Dict[str, Any]:
        """Delete a customer by phone number."""
        response = self.supabase.table(self.TABLE_NAME) \
            .delete() \
            .eq("phone_number", phone_number) \
            .execute()
        Logger.info(f"Deleted customer {phone_number}")
        return response.data

    def list_customers(self, limit: Optional[int] = None, offset: int = 0) -> List[Dict[str, Any]]:
        """List customers with pagination support.
        
        Args:
            limit: Maximum number of customers to return. If None, returns all customers.
            offset: Number of customers to skip.
            
        Returns:
            List of customer records.
        """
        query = self.supabase.table(self.TABLE_NAME).select("*")
        
        if limit is not None:
            query = query.range(offset, offset + limit - 1)
            Logger.info(f"Listing customers with limit {limit}, offset {offset}")
        else:
            Logger.info("Listing all customers")
            
        response = query.execute()
        return response.data

    def get_unique_tags(self) -> List[str]:
        """Get all unique tags from customers, sorted alphabetically."""
        try:
            # Get all customers with tags
            response = self.supabase.table(self.TABLE_NAME) \
                .select("tags") \
                .not_.is_("tags", "null") \
                .execute()
            
            # Collect all unique tags
            tags_set = set()
            for customer in response.data:
                customer_tags = customer.get("tags", [])
                if customer_tags:
                    tags_set.update(customer_tags)
           
            Logger.info(f"Retrieved {len(tags_set)} unique tags")
            return tags_set
            
        except Exception as e:
            Logger.error(f"Error getting unique tags: {e}")
            return []
            
    def count_customers(self) -> int:
        """Get total count of customers."""
        response = self.supabase.table(self.TABLE_NAME) \
            .select("phone_number", count="exact") \
            .execute()
        return response.count or 0

    def is_escalated(self, phone_number: str) -> bool:
        """Check if a customer has escalation_status=True."""
        response = self.supabase.table(self.TABLE_NAME) \
            .select("escalation_status") \
            .eq("phone_number", phone_number) \
            .limit(1) \
            .execute()
        
        if not response.data:
            Logger.warning(f"No escalation status found for customer: {phone_number}")
            return False  # Customer not found, treat as not escalated

        Logger.info(f"Fetched escalation status for customer: {phone_number}")
        return bool(response.data[0].get("escalation_status"))

    def update_escalation_status(self, phone_number: str, status: bool) -> bool:
        """
        Update a customer's escalation_status.
        Returns True if update was successful, False if customer not found.
        """
        response = self.supabase.table(self.TABLE_NAME) \
            .update({"escalation_status": status}) \
            .eq("phone_number", phone_number) \
            .execute()

        return bool(response.data)  # True if something was updated
