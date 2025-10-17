from agents import function_tool, RunContextWrapper
from typing import Optional
from pydantic import Field
from whatsapp_agent.database.waitlist import WaitlistDataBase
from whatsapp_agent.context.global_context import GlobalContext

@function_tool
def add_customer_to_waitlist(
    wrapper: RunContextWrapper[GlobalContext],
    product_id: int = Field(..., description="The shopify ID of the product that is out of stock"),
    customer_name: Optional[str] = Field(None, description="Customer's name (optional)")
) -> str:
    """
    Add a customer to the waitlist for a specific product that is out of stock.
    
    This function should be used when:
    - A customer asks about a product that is currently out of stock
    - A customer wants to be notified when a product becomes available
    - A customer expresses interest in purchasing an unavailable item
    
    CRITICAL: You MUST first call `search_shop_catalog` to find the product and extract its numeric ID.
    
    Args:
        product_id: The NUMERIC product ID only (e.g., 9555098665207). 
                   DO NOT pass the product name, title, or full GID string.
                   Extract ONLY the number from the GID format "gid://shopify/Product/9555098665207"
                   Example: If GID is "gid://shopify/Product/9555098665207", pass 9555098665207
                   WRONG: "Blue Widget", "gid://shopify/Product/9555098665207"
                   CORRECT: 9555098665207
        customer_name: The customer's name (optional, helps personalize notifications)
    
    Returns:
        A message indicating whether the customer was successfully added to the waitlist
        
    Example workflow:
        1. Call search_shop_catalog(query="blue widget") 
        2. Extract numeric ID from result: "gid://shopify/Product/9555098665207" -> 9555098665207
        3. Call add_to_waitlist(product_id=9555098665207, customer_name="John Doe")
    """
    db = WaitlistDataBase()
    result = db.add_to_waitlist(product_id, wrapper.context.customer_context.phone_number, customer_name)
    
    return result["message"]

@function_tool
def check_customer_waitlist(
    wrapper: RunContextWrapper[GlobalContext],
) -> str:
    """
    Check which products a customer is waiting for.
        
    Returns:
        A message listing all products the customer is waiting for
    """
    db = WaitlistDataBase()
    entries = db.get_waitlist_by_customer(wrapper.context.customer_context.phone_number)
    
    if not entries:
        return "You are not on any waitlists currently."
    
    products = [entry.product_id for entry in entries]
    return f"You are on the waitlist for {len(products)} product(s): {', '.join(products)}"

