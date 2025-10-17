from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field
from typing import List, Optional
from whatsapp_agent.database.waitlist import WaitlistDataBase
from whatsapp_agent.schema.waitlist import WaitlistEntry
from rich import print
from whatsapp_agent._debug import Logger

# Create router
waitlist_router = APIRouter(prefix="/waitlist", tags=["Waitlist"])

# Initialize database
waitlist_db = WaitlistDataBase()

from whatsapp_agent.shopify.products import ShopifyProducts
shopify = ShopifyProducts()

class WaitlistedProductDetail(BaseModel):
    product_id: str
    product_title: str
    product_image: Optional[str] = None
    product_url: Optional[str] = None
    waitlist_count: int
    is_available: bool
    inventory_quantity: int

class WaitlistedProductsResponse(BaseModel):
    products: List[WaitlistedProductDetail]
    total: int

class AddToWaitlistRequest(BaseModel):
    product_id: str = Field(..., description="The ID of the out-of-stock product")
    customer_phone: str = Field(..., description="Customer's WhatsApp phone number")
    customer_name: Optional[str] = Field(None, description="Optional customer name")

class WaitlistResponse(BaseModel):
    success: bool
    message: str
    entry: Optional[WaitlistEntry] = None

class WaitlistEntriesResponse(BaseModel):
    entries: List[WaitlistEntry]
    total: int

@waitlist_router.post("/add", response_model=WaitlistResponse)
async def add_to_waitlist(request: AddToWaitlistRequest):
    """
    Add a customer to the waitlist for a specific product.
    
    - **product_id**: The ID of the out-of-stock product
    - **customer_phone**: Customer's WhatsApp phone number
    - **customer_name**: Optional customer name
    """
    try:
        result = waitlist_db.add_to_waitlist(
            product_id=request.product_id,
            customer_phone=request.customer_phone,
            customer_name=request.customer_name
        )
        
        return WaitlistResponse(
            success=result["success"],
            message=result["message"],
            entry=WaitlistEntry(**result["entry"]) if result.get("entry") else None
        )
        
    except Exception as e:
        Logger.error(f"Failed to add to waitlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@waitlist_router.get("/by-product/{product_id}", response_model=WaitlistEntriesResponse)
async def get_waitlist_by_product(
    product_id: str = Path(..., description="The product ID to get waitlist for")
):
    """
    Get all waitlist entries for a specific product.
    
    - **product_id**: The product ID to get waitlist for
    """
    try:
        entries = waitlist_db.get_waitlist_by_product(product_id)
        return WaitlistEntriesResponse(
            entries=entries,
            total=len(entries)
        )
        
    except Exception as e:
        Logger.error(f"Failed to get waitlist for product {product_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@waitlist_router.get("/by-customer/{customer_phone}", response_model=WaitlistEntriesResponse)
async def get_waitlist_by_customer(
    customer_phone: str = Path(..., description="The customer phone number to get waitlist for")
):
    """
    Get all waitlist entries for a specific customer.
    
    - **customer_phone**: The customer phone number to get waitlist for
    """
    try:
        entries = waitlist_db.get_waitlist_by_customer(customer_phone)
        return WaitlistEntriesResponse(
            entries=entries,
            total=len(entries)
        )
        
    except Exception as e:
        Logger.error(f"Failed to get waitlist for customer {customer_phone}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@waitlist_router.delete("/{product_id}/{customer_phone}")
async def remove_from_waitlist(
    product_id: str = Path(..., description="The product ID to remove from waitlist"),
    customer_phone: str = Path(..., description="The customer phone number to remove from waitlist")
):
    """
    Remove a customer from the waitlist for a specific product.
    
    - **product_id**: The product ID to remove from waitlist
    - **customer_phone**: The customer phone number to remove from waitlist
    """
    try:
        success = waitlist_db.remove_from_waitlist(product_id, customer_phone)
        if not success:
            raise HTTPException(
                status_code=404, 
                detail="Waitlist entry not found or could not be removed"
            )
            
        return {"success": True, "message": "Successfully removed from waitlist"}
        
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"Failed to remove from waitlist: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@waitlist_router.get("/products", response_model=WaitlistedProductsResponse)
async def get_waitlisted_products():
    """
    Get all products that have waitlist entries, including their Shopify details.
    Returns a list of products with their details, inventory status, and waitlist counts.
    """
    try:
        product_ids = waitlist_db.get_all_waitlisted_products()
        waitlisted_products = []

        for product_id in product_ids:
            # Get waitlist count for this product
            waitlist_entries = waitlist_db.get_waitlist_by_product(product_id)
            waitlist_count = len(waitlist_entries)

            # Get product details from Shopify
            product_data = shopify.get_product_inventory(product_id)
            if not product_data:
                Logger.warning(f"Product {product_id} not found in Shopify but has waitlist entries")
                continue

            # Calculate total inventory across all variants
            total_inventory = sum(
                variant.get("inventory_quantity", 0) 
                for variant in product_data.get("variants", [])
            )

            # Get the main product image if available
            product_endpoint = f"/products/{product_id}.json"
            try:
                full_product_data = shopify._make_request("GET", product_endpoint)
                product = full_product_data.get("product", {})
                # Get the primary product image (first non-variant specific image or the default image)
                images = product.get("images", [])
                main_image = next(
                    (img for img in images if not img.get("variant_ids")),
                    images[0] if images else None
                )
                image_url = main_image.get("src") if main_image else None
                # Use shop_domain from the Shopify base class
                product_url = f"https://{shopify.shop_domain}/products/{product.get('handle')}" if product.get('handle') else None
            except Exception as e:
                Logger.error(f"Error fetching additional product details: {e}")
                image_url = None
                product_url = None

            # Create product detail object
            product_detail = WaitlistedProductDetail(
                product_id=product_id,
                product_title=product_data.get("product_title", "Unknown Product"),
                product_image=image_url,
                product_url=product_url,
                waitlist_count=waitlist_count,
                is_available=total_inventory > 0,
                inventory_quantity=total_inventory
            )
            waitlisted_products.append(product_detail)

        return WaitlistedProductsResponse(
            products=waitlisted_products,
            total=len(waitlisted_products)
        )
    except Exception as e:
        Logger.error(f"Failed to get waitlisted products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@waitlist_router.post("/{product_id}/{customer_phone}/mark-notified")
async def mark_as_notified(
    product_id: str = Path(..., description="The product ID"),
    customer_phone: str = Path(..., description="The customer phone number")
):
    """
    Mark a waitlist entry as notified when product is back in stock.
    
    - **product_id**: The product ID 
    - **customer_phone**: The customer phone number
    """
    try:
        success = waitlist_db.mark_as_notified(product_id, customer_phone)
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Waitlist entry not found or could not be updated"
            )
            
        return {"success": True, "message": "Successfully marked as notified"}
        
    except HTTPException:
        raise
    except Exception as e:
        Logger.error(f"Failed to mark as notified: {e}")
        raise HTTPException(status_code=500, detail=str(e))