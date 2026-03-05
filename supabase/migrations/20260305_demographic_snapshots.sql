-- Monthly demographic snapshots for accurate Gen Z tracking
-- This tracks total followers and Gen Z followers at the end of each month
-- so we can calculate the actual Gen Z gained (not just apply current %)

CREATE TABLE IF NOT EXISTS demographic_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'facebook', 'tiktok')),
    snapshot_month TEXT NOT NULL, -- Format: YYYY-MM (e.g., '2026-01')

    -- Total followers at time of snapshot
    total_followers INTEGER NOT NULL DEFAULT 0,

    -- Gen Z followers (calculated from total × gen_z_percentage)
    gen_z_followers INTEGER NOT NULL DEFAULT 0,

    -- Age breakdown percentages at time of snapshot
    age_13_17_percent DECIMAL(5,2) DEFAULT 0,
    age_18_24_percent DECIMAL(5,2) DEFAULT 0,
    gen_z_percent DECIMAL(5,2) DEFAULT 0, -- Sum of 13-17 + 18-24

    -- Other age groups for reference
    age_25_34_percent DECIMAL(5,2) DEFAULT 0,
    age_35_44_percent DECIMAL(5,2) DEFAULT 0,
    age_45_54_percent DECIMAL(5,2) DEFAULT 0,
    age_55_64_percent DECIMAL(5,2) DEFAULT 0,
    age_65_plus_percent DECIMAL(5,2) DEFAULT 0,

    -- Metadata
    is_baseline BOOLEAN DEFAULT FALSE, -- Mark Jan 1 snapshots as baseline
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Only one snapshot per platform per month
    UNIQUE(platform, snapshot_month)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_demographic_snapshots_platform_month
ON demographic_snapshots(platform, snapshot_month);

-- Insert baseline snapshots for 2026-01 (you'll need to update these with actual data)
-- These represent follower counts and demographics as of January 1, 2026

-- Example baseline insert (uncomment and modify with your actual Jan 1 data):
-- INSERT INTO demographic_snapshots (platform, snapshot_month, total_followers, gen_z_followers, age_13_17_percent, age_18_24_percent, gen_z_percent, is_baseline)
-- VALUES
--   ('youtube', '2026-01', 170000, 51000, 5.0, 25.0, 30.0, true),
--   ('instagram', '2026-01', 1500000, 450000, 8.0, 22.0, 30.0, true),
--   ('facebook', '2026-01', 2905370, 580000, 4.0, 16.0, 20.0, true),
--   ('tiktok', '2026-01', 50000, 25000, 15.0, 35.0, 50.0, true);
