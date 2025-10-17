from whatsapp_agent.shopify.base import ShopifyBase
from rich import print

def main():

    shopify = ShopifyBase()
    a = shopify.test_connection()
    if a:
        print("✅ Connected to Shopify!")
        # print(shopify.get_shop_info())

        # customer = shopify.find_customer_by_phone("923218241590")
        # print(customer)
        # 7361171489015
        # orders= shopify.get_customer_orders("7361171489015",1)
        # print(orders)

        # tracking = shopify.track_latest_order_by_phone("923218241590")
        # print(tracking)

        # product = shopify.get_product_by_id("9563392835831")
        # print(product)

        # order = shopify.get_order_by_id("6434523152625")
        # print(order)

    else:
        print("❌ Failed to connect to Shopify!")

    from whatsapp_agent.tools.customer_support.order_tracking import track_customer_order_tool

    # tracking = track_customer_order_tool(tracking_no="KI7506019047",courier="leopards")
    # tracking = track_customer_order_tool(phone_number="923110099220")
    tracking = track_customer_order_tool(order_id="15515")
    print(tracking)

if __name__ == "__main__":
    main()