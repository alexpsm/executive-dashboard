-- ===========================================
-- COMPETITOR METRICS TABLE - ADD MISSING COLUMNS
-- ===========================================
-- Run this in Supabase SQL Editor
-- This will add any columns that don't already exist

-- First, create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS competitor_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    metric_month TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competitor_name, platform, metric_month)
);

-- Add Instagram columns if missing
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS ig_followers INTEGER DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS ig_engagement_rate DECIMAL(8,4) DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS ig_est_post_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS ig_est_reach INTEGER DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS ig_avg_likes INTEGER DEFAULT 0;

-- Add YouTube columns if missing
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS yt_subscribers INTEGER DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS yt_video_engagement_rate DECIMAL(8,4) DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS yt_shorts_engagement_rate DECIMAL(8,4) DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS yt_est_integration_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS yt_videos_avg_views INTEGER DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS yt_shorts_avg_views INTEGER DEFAULT 0;

-- Add TikTok columns if missing
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS tt_followers INTEGER DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS tt_engagement_rate DECIMAL(8,4) DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS tt_avg_views_90d INTEGER DEFAULT 0;
ALTER TABLE competitor_metrics ADD COLUMN IF NOT EXISTS tt_est_integration_price DECIMAL(15,2) DEFAULT 0;

-- Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_competitor_metrics_month ON competitor_metrics(metric_month);
CREATE INDEX IF NOT EXISTS idx_competitor_metrics_name ON competitor_metrics(competitor_name);

-- RLS Policy
ALTER TABLE competitor_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all competitor_metrics" ON competitor_metrics;
CREATE POLICY "Allow all competitor_metrics" ON competitor_metrics FOR ALL USING (true);
