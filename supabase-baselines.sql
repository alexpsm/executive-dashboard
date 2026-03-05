-- Platform Baselines Table
-- Stores follower counts at the start of 2026 for accurate YTD calculation
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS platform_baselines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL UNIQUE CHECK (platform IN ('facebook', 'instagram', 'youtube', 'tiktok')),
    followers_jan1_2026 INTEGER DEFAULT 0,
    views_jan1_2026 INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE platform_baselines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all baselines" ON platform_baselines;
CREATE POLICY "Allow all baselines" ON platform_baselines FOR ALL USING (true);

-- Insert placeholder rows for each platform
INSERT INTO platform_baselines (platform, followers_jan1_2026, notes) VALUES
    ('instagram', 0, 'Enter Instagram follower count as of Jan 1, 2026'),
    ('facebook', 0, 'Enter Facebook page fans as of Jan 1, 2026'),
    ('youtube', 0, 'YouTube calculates via Analytics API - subscribersGained metric'),
    ('tiktok', 0, 'Enter TikTok follower count as of Jan 1, 2026')
ON CONFLICT (platform) DO NOTHING;

-- Add followers_gained column to social_metrics if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'social_metrics' AND column_name = 'followers_gained') THEN
        ALTER TABLE social_metrics ADD COLUMN followers_gained INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'social_metrics' AND column_name = 'api_source') THEN
        ALTER TABLE social_metrics ADD COLUMN api_source TEXT DEFAULT 'api';
    END IF;
END $$;
