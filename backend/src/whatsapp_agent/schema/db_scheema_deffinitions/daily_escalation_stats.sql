-- 1. Create the main table for daily escalation statistics
CREATE TABLE daily_escalation_stats (
    date DATE PRIMARY KEY,
    -- Daily counters
    total_escalations INTEGER DEFAULT 0,
    total_resolved INTEGER DEFAULT 0,
    -- Breakdown by customer type
    b2b_escalations INTEGER DEFAULT 0,
    d2c_escalations INTEGER DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create a function to auto-update the "updated_at" timestamp
CREATE OR REPLACE FUNCTION update_escalation_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger that runs the function before every UPDATE
CREATE TRIGGER set_escalation_stats_updated_at
BEFORE UPDATE ON daily_escalation_stats
FOR EACH ROW
EXECUTE FUNCTION update_escalation_stats_updated_at();

-- 4. Add comments for clarity
COMMENT ON TABLE daily_escalation_stats IS 'Tracks daily statistics about customer escalations';

COMMENT ON COLUMN daily_escalation_stats.total_escalations IS 'Total number of escalations on this date';
COMMENT ON COLUMN daily_escalation_stats.total_resolved IS 'Total number of escalations resolved on this date';
COMMENT ON COLUMN daily_escalation_stats.b2b_escalations IS 'Number of B2B customer escalations on this date';
COMMENT ON COLUMN daily_escalation_stats.d2c_escalations IS 'Number of D2C customer escalations on this date';