-- Migration: Add extra columns to deals table for Monday.com sync
-- Run this in Supabase SQL Editor

-- Add missing columns if they don't exist
ALTER TABLE deals ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS expected_close_date DATE;

-- Rename due_date to expected_close_date if it exists (optional, for consistency)
-- Only run this if you want to migrate existing data
-- ALTER TABLE deals RENAME COLUMN due_date TO expected_close_date;

-- Create index for faster queries by stage
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_source ON deals(source);

-- Verify the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'deals'
ORDER BY ordinal_position;
