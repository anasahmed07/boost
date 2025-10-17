from typing import List, Optional
from datetime import datetime
from whatsapp_agent.database.base import DataBase
from whatsapp_agent.schema.waitlist import WaitlistEntry


class WaitlistDataBase(DataBase):
    """Database operations for product waitlist management."""
    TABLE_NAME = "product_waitlist"

    def __init__(self):
        super().__init__()
    
    def add_to_waitlist(
        self, 
        product_id: str, 
        customer_phone: str, 
        customer_name: Optional[str] = None
    ) -> dict:
        """
        Add a customer to the waitlist for a specific product.
        
        Args:
            product_id: The ID of the out-of-stock product
            customer_phone: Customer's WhatsApp phone number
            customer_name: Optional customer name
            
        Returns:
            dict with success status and message
        """
        if isinstance(product_id, str) and not product_id.isdigit():
            return {
                "success": False,
                "message": "Invalid product_id. It should be a numeric string.",
                "entry": None
            }
        try:
            existing = self.supabase.table(self.TABLE_NAME).select("*").eq(
                "product_id", product_id
            ).eq("customer_phone", customer_phone).execute()
            
            existing_data = getattr(existing, 'data', [])
            if existing_data:
                return {
                    "success": False,
                    "message": f"You are already on the waitlist for this product.",
                    "entry": existing_data[0]
                }
            
            data = {
                "product_id": product_id,
                "customer_phone": customer_phone,
                "customer_name": customer_name,
                "created_at": datetime.utcnow().isoformat(),
                "notified": False
            }
            
            result = self.supabase.table(self.TABLE_NAME).insert(data).execute()
            
            result_data = getattr(result, 'data', [])
            return {
                "success": True,
                "message": f"Successfully added to waitlist! We'll notify you when this product is back in stock.",
                "entry": result_data[0] if result_data else None
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error adding to waitlist: {str(e)}",
                "entry": None
            }
    
    def get_waitlist_by_product(self, product_id: str) -> List[WaitlistEntry]:
        """
        Get all waitlist entries for a specific product.
        
        Args:
            product_id: The product ID
            
        Returns:
            List of WaitlistEntry objects
        """
        
        try:
            result = self.supabase.table(self.TABLE_NAME).select("*").eq(
                "product_id", product_id
            ).order("created_at", desc=False).execute()
            
            result_data = getattr(result, 'data', [])
            return [WaitlistEntry(**entry) for entry in result_data]
        except Exception as e:
            print(f"Error fetching waitlist: {e}")
            return []
    
    def get_waitlist_by_customer(self, customer_phone: str) -> List[WaitlistEntry]:
        """
        Get all waitlist entries for a specific customer.
        
        Args:
            customer_phone: Customer's phone number
            
        Returns:
            List of WaitlistEntry objects
        """

        try:
            result = self.supabase.table(self.TABLE_NAME).select("*").eq(
                "customer_phone", customer_phone
            ).order("created_at", desc=True).execute()
            
            result_data = getattr(result, 'data', [])
            return [WaitlistEntry(**entry) for entry in result_data]
        except Exception as e:
            print(f"Error fetching customer waitlist: {e}")
            return []
    
    def mark_as_notified(self, product_id: str, customer_phone: str) -> bool:
        """
        Mark a waitlist entry as notified.
        
        Args:
            product_id: The product ID
            customer_phone: Customer's phone number
            
        Returns:
            True if successful, False otherwise
        """
        
        try:
            self.supabase.table(self.TABLE_NAME).update(
                {"notified": True}
            ).eq("product_id", product_id).eq("customer_phone", customer_phone).execute()
            return True
        except Exception as e:
            print(f"Error marking as notified: {e}")
            return False
    
    def remove_from_waitlist(self, product_id: str, customer_phone: str) -> bool:
        """
        Remove a customer from the waitlist.
        
        Args:
            product_id: The product ID
            customer_phone: Customer's phone number
            
        Returns:
            True if successful, False otherwise
        """
        
        try:
            self.supabase.table(self.TABLE_NAME).delete().eq(
                "product_id", product_id
            ).eq("customer_phone", customer_phone).execute()
            return True
        except Exception as e:
            print(f"Error removing from waitlist: {e}")
            return False
            
    def get_all_waitlisted_products(self) -> List[str]:
        """
        Get all unique product IDs that have waitlist entries.
        
        Returns:
            List of product IDs that have waitlist entries
        """
        
        try:
            result = self.supabase.table(self.TABLE_NAME).select(
                "product_id"
            ).execute()
            
            # Get unique product IDs
            product_ids = set()
            for entry in result.data or []:
                if entry.get("product_id"):
                    product_ids.add(entry["product_id"])
                    
            return sorted(list(product_ids))
        except Exception as e:
            print(f"Error fetching waitlisted products: {e}")
            return []
