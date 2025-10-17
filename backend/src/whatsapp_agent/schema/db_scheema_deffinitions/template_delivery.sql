-- Template Delivery Tracking Tables
-- This file contains the SQL schema for tracking template message deliveries

-- Table for bulk delivery jobs
CREATE TABLE IF NOT EXISTS bulk_delivery_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR(255) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255),
    total_recipients INTEGER NOT NULL DEFAULT 0,
    successful_sends INTEGER NOT NULL DEFAULT 0,
    failed_sends INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'processing' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'delivered', 'read')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Table for individual delivery records
CREATE TABLE IF NOT EXISTS template_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES bulk_delivery_jobs(id) ON DELETE CASCADE,
    template_id VARCHAR(255) NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    campaign_id VARCHAR(255),
    phone_number VARCHAR(20) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'delivered', 'read')),
    error_message TEXT,
    whatsapp_message_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bulk_delivery_jobs_template_id ON bulk_delivery_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_bulk_delivery_jobs_campaign_id ON bulk_delivery_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bulk_delivery_jobs_status ON bulk_delivery_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_delivery_jobs_created_at ON bulk_delivery_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_template_deliveries_job_id ON template_deliveries(job_id);
CREATE INDEX IF NOT EXISTS idx_template_deliveries_template_id ON template_deliveries(template_id);
CREATE INDEX IF NOT EXISTS idx_template_deliveries_phone_number ON template_deliveries(phone_number);
CREATE INDEX IF NOT EXISTS idx_template_deliveries_status ON template_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_template_deliveries_whatsapp_message_id ON template_deliveries(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_template_deliveries_created_at ON template_deliveries(created_at DESC);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_bulk_delivery_jobs_updated_at 
    BEFORE UPDATE ON bulk_delivery_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_deliveries_updated_at 
    BEFORE UPDATE ON template_deliveries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE bulk_delivery_jobs IS 'Tracks bulk template delivery jobs and their overall status';
COMMENT ON TABLE template_deliveries IS 'Tracks individual template message deliveries within bulk jobs';

COMMENT ON COLUMN bulk_delivery_jobs.id IS 'Unique identifier for the bulk delivery job';
COMMENT ON COLUMN bulk_delivery_jobs.template_id IS 'WhatsApp template ID used for this job';
COMMENT ON COLUMN bulk_delivery_jobs.template_name IS 'Human-readable template name';
COMMENT ON COLUMN bulk_delivery_jobs.campaign_id IS 'Optional campaign ID for tracking';
COMMENT ON COLUMN bulk_delivery_jobs.total_recipients IS 'Total number of recipients in this job';
COMMENT ON COLUMN bulk_delivery_jobs.successful_sends IS 'Number of successfully sent messages';
COMMENT ON COLUMN bulk_delivery_jobs.failed_sends IS 'Number of failed message sends';
COMMENT ON COLUMN bulk_delivery_jobs.status IS 'Current status of the bulk job';
COMMENT ON COLUMN bulk_delivery_jobs.error_message IS 'Error message if the job failed';

COMMENT ON COLUMN template_deliveries.id IS 'Unique identifier for the individual delivery';
COMMENT ON COLUMN template_deliveries.job_id IS 'Reference to the bulk delivery job';
COMMENT ON COLUMN template_deliveries.phone_number IS 'Recipient phone number';
COMMENT ON COLUMN template_deliveries.status IS 'Current status of this individual delivery';
COMMENT ON COLUMN template_deliveries.whatsapp_message_id IS 'WhatsApp message ID for tracking delivery status';
COMMENT ON COLUMN template_deliveries.sent_at IS 'Timestamp when message was sent';
COMMENT ON COLUMN template_deliveries.delivered_at IS 'Timestamp when message was delivered';
COMMENT ON COLUMN template_deliveries.read_at IS 'Timestamp when message was read';
