-- Ensure UUID generation is available
create extension if not exists pgcrypto;

CREATE TABLE IF NOT EXISTS warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    issue_description TEXT NOT NULL,
    order_id VARCHAR(255),
    attachments JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_customer_phone ON warranty_claims(customer_phone);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON warranty_claims(status);