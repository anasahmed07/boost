-- SQL Schema for Product Waitlist Table
-- Run this in your Supabase SQL Editor to create the waitlist table

CREATE TABLE IF NOT EXISTS product_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified BOOLEAN DEFAULT FALSE,
    
    -- Ensure one customer can only be on waitlist once per product
    UNIQUE(product_id, customer_phone)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_waitlist_product_id ON product_waitlist(product_id);
CREATE INDEX IF NOT EXISTS idx_product_waitlist_customer_phone ON product_waitlist(customer_phone);
CREATE INDEX IF NOT EXISTS idx_product_waitlist_created_at ON product_waitlist(created_at);
CREATE INDEX IF NOT EXISTS idx_product_waitlist_notified ON product_waitlist(notified);

-- Add Row Level Security (RLS) policies if needed
-- ALTER TABLE product_waitlist ENABLE ROW LEVEL SECURITY;

-- Example: Allow service role to access all data
-- CREATE POLICY "Service role can access all data" ON product_waitlist
--     FOR ALL USING (auth.role() = 'service_role');
