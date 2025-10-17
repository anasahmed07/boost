-- 1. Create the main table
CREATE TABLE daily_message_stats (
  date DATE PRIMARY KEY,
  -- Message counts by type
  total_messages INTEGER DEFAULT 0,
  text_messages INTEGER DEFAULT 0,
  image_messages INTEGER DEFAULT 0,
  video_messages INTEGER DEFAULT 0,
  audio_messages INTEGER DEFAULT 0,
  document_messages INTEGER DEFAULT 0,
  -- Sender counts
  total_customer_messages INTEGER DEFAULT 0,
  total_agent_messages INTEGER DEFAULT 0,
  total_representative_messages INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create a function to auto-update the "updated_at" timestamp
CREATE OR REPLACE FUNCTION update_message_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger that runs the function before every UPDATE
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON daily_message_stats
FOR EACH ROW
EXECUTE FUNCTION update_message_stats_updated_at();

-- 4. Add indexes for commonly queried fields
CREATE INDEX idx_daily_message_stats_date ON daily_message_stats (date);
CREATE INDEX idx_daily_message_stats_total_messages ON daily_message_stats (total_messages);

-- 5. Add column comments for clarity
COMMENT ON TABLE daily_message_stats IS 'Tracks daily message statistics including counts by type and sender';

COMMENT ON COLUMN daily_message_stats.date IS 'The date for these statistics';
COMMENT ON COLUMN daily_message_stats.total_messages IS 'Total number of messages sent on this date across all types and senders';

-- Message type columns
COMMENT ON COLUMN daily_message_stats.text_messages IS 'Number of text messages sent on this date';
COMMENT ON COLUMN daily_message_stats.image_messages IS 'Number of image messages sent on this date';
COMMENT ON COLUMN daily_message_stats.video_messages IS 'Number of video messages sent on this date';
COMMENT ON COLUMN daily_message_stats.audio_messages IS 'Number of audio messages sent on this date';
COMMENT ON COLUMN daily_message_stats.document_messages IS 'Number of document messages sent on this date';

-- Sender type columns
COMMENT ON COLUMN daily_message_stats.total_customer_messages IS 'Total number of messages sent by customers on this date';
COMMENT ON COLUMN daily_message_stats.total_agent_messages IS 'Total number of messages sent by AI agents on this date';
COMMENT ON COLUMN daily_message_stats.total_representative_messages IS 'Total number of messages sent by customer service representatives on this date';

-- Timestamp columns
COMMENT ON COLUMN daily_message_stats.created_at IS 'Timestamp when this record was created';
COMMENT ON COLUMN daily_message_stats.updated_at IS 'Timestamp when this record was last updated';
