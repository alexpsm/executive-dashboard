-- Migration: Add missing columns to existing deals table
-- Run this in Supabase SQL Editor if you want to preserve existing data

-- Add new columns for Monday.com sync
ALTER TABLE deals ADD COLUMN IF NOT EXISTS group_id TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS group_color TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_color TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS update_notes TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS close_probability INTEGER DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS forecast_value DECIMAL(15,2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_interaction_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS account_name TEXT;

-- Rename existing columns if needed (skip if already correct)
-- ALTER TABLE deals RENAME COLUMN probability TO close_probability;
-- ALTER TABLE deals RENAME COLUMN company TO account_name;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deals_group_id ON deals(group_id);
CREATE INDEX IF NOT EXISTS idx_deals_group_name ON deals(group_name);

-- Verify
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'deals';
