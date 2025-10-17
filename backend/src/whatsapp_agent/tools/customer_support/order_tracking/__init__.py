from typing import Optional, Dict, Any
from agents import function_tool

from whatsapp_agent._debug import Logger
from whatsapp_agent.tools.customer_support.order_tracking.tracking_providers import track_leopards, track_postex
from whatsapp_agent.shopify.base import ShopifyBase

shopify_base = ShopifyBase() # Initialize ShopifyBase

@function_tool
def track_customer_order_tool(
    order_id: Optional[str] = None,
    tracking_no: Optional[str] = None,
    courier: Optional[str] = None,
    phone_number: Optional[str] = None # Added phone_number parameter
) -> Dict[str, Any]:
    """
    Track customer order using either order ID, courier name + tracking number, or customer phone number.

    Args:
        order_id: Shopify order ID to fetch fulfillment data e.g(#Booster12345 , #12345 , etc)
        tracking_no: Tracking number to identify courier and get status
        courier: Courier service name (postex/leopards)
        phone_number: Customer's phone number to find their latest order

    Returns:
        Dict containing tracking status and details
    """

    if not order_id and not tracking_no and not phone_number:
        return {
            "error": "Either order_id, tracking_no and courier, or phone_number must be provided",
            "status": "failed"
        }

    try:
        if order_id:
            return track_by_order_no(order_id)
        elif tracking_no and courier:
            return track_by_tracking_number(tracking_no, courier)
        elif phone_number:
            return track_latest_order_by_phone(phone_number)
    except Exception as e:
        return {
            "error": f"Tracking failed: {str(e)}",
            "status": "failed"
        }

def track_by_order_no(order_no: str) -> Dict[str, Any]:
    """Fetch fulfillment data from Shopify REST Admin API"""

    try:
        # Get order details
        order_data = shopify_base.get_order_by_order_no(order_no)
        if not order_data:
            return {
                "error": "Order not found",
                "status": "failed"
            }

        order_name = order_data.get("name")
        order_id = order_data.get("id")
        fulfillments = shopify_base.get_order_fulfillments(order_id)

        if not fulfillments:
            return {
                "status": "pending",
                "message": "Order not yet fulfilled",
                "order_name": order_name
            }

        # Get the latest fulfillment (sort by created_at)
        latest_fulfillment = sorted(fulfillments, key=lambda x: x.get("created_at", ""))[-1]

        # Shopify REST fields: tracking_number, tracking_numbers, tracking_url, tracking_urls, tracking_company
        tracking_numbers = latest_fulfillment.get("tracking_numbers") or []
        single_tracking_number = latest_fulfillment.get("tracking_number")
        if single_tracking_number and single_tracking_number not in tracking_numbers:
            tracking_numbers.append(single_tracking_number)

        tracking_urls = latest_fulfillment.get("tracking_urls") or []
        single_tracking_url = latest_fulfillment.get("tracking_url")
        if single_tracking_url and single_tracking_url not in tracking_urls:
            tracking_urls.append(single_tracking_url)

        tracking_company = latest_fulfillment.get("tracking_company")

        tracking_details_list = []
        if tracking_numbers:
            for idx, tracking_number in enumerate(tracking_numbers):
                direct_tracking_url = tracking_urls[idx] if idx < len(tracking_urls) else None

                courier_tracking = {}
                if tracking_number and tracking_company:
                    shopify_courier = tracking_company.lower().strip()
                    courier_tracking = track_by_tracking_number(tracking_number, shopify_courier)

                tracking_details_list.append({
                    "tracking_number": tracking_number,
                    "company": tracking_company,
                    "direct_tracking_url": direct_tracking_url,
                    "courier_status": courier_tracking
                })
        else:
            # No tracking numbers present yet
            tracking_details_list.append({
                "tracking_number": None,
                "company": tracking_company,
                "direct_tracking_url": None,
                "courier_status": {}
            })

        result = {
            "status": "fulfilled",
            "order_name": order_name,
            "fulfillment_status": latest_fulfillment.get("status"),
            "created_at": latest_fulfillment.get("created_at"),
            "updated_at": latest_fulfillment.get("updated_at"),
            "location": latest_fulfillment.get("location", {}).get("name") if isinstance(latest_fulfillment.get("location"), dict) else None,
            "tracking_details": tracking_details_list
        }

        return result

    except Exception as e:
        return {
            "error": f"Shopify API error: {str(e)}",
            "status": "failed"
        }

def track_by_tracking_number(tracking_no: str, courier: Optional[str] = None) -> Dict[str, Any]:
    courier_name = "" # Initialize courier_name
    if courier:
        # Normalize courier name
        courier_name = courier.lower().strip()

# postex is shown as other in the shopify admin panel
    if courier_name == "other":
        return track_postex(tracking_no)
    elif courier_name == "leopards":
        return track_leopards(tracking_no)
    else:
        return {
            "error": "Courier service not supported",
            "status": "failed",
            "tracking_number": tracking_no,
            "provided_courier": courier
        }

def track_latest_order_by_phone(phone_number: str) -> Dict[str, Any]:
    """
    Fetches the latest order for a customer by phone number and returns its tracking status.
    """
    try:
        # Use the method from ShopifyBase to get the latest order
        latest_order = shopify_base.get_latest_order_by_phone(phone_number)
        
        if not latest_order:
            return {
                "error": f"No order found for customer with phone number: {phone_number}",
                "status": "failed"
            }

        latest_order_no = str(latest_order.get("order_number"))
        Logger.info(latest_order_no)
        
        # Use the existing track_by_order_id to get fulfillment details
        return track_by_order_no(latest_order_no)
    except Exception as e:
        return {
            "error": f"Failed to track latest order for {phone_number}: {str(e)}",
            "status": "failed"
        }

