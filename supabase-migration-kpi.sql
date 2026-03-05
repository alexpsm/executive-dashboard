-- ===========================================
-- EXECUTIVE DASHBOARD - KPI SCHEMA MIGRATION
-- ===========================================
-- Run this AFTER the main schema in Supabase SQL Editor

-- ===========================================
-- 1. FINANCIAL TABLES
-- ===========================================

-- Financial KPIs (aggregated from Xero)
CREATE TABLE IF NOT EXISTS financial_kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL UNIQUE,
    cross_platform_revenue DECIMAL(15,2) DEFAULT 0,
    b2b_digital_sales DECIMAL(15,2) DEFAULT 0,
    running_costs_total DECIMAL(15,2) DEFAULT 0,
    running_costs_baseline DECIMAL(15,2) DEFAULT 0,
    running_costs_saved DECIMAL(15,2) DEFAULT 0,
    running_costs_last_year DECIMAL(15,2) DEFAULT 0, -- Same period last year for comparison
    xero_synced_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add column if table already exists
ALTER TABLE financial_kpis ADD COLUMN IF NOT EXISTS running_costs_last_year DECIMAL(15,2) DEFAULT 0;

-- Xero Accounts (for expense categorization)
CREATE TABLE IF NOT EXISTS xero_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL,
    account_code TEXT,
    account_name TEXT NOT NULL,
    account_type TEXT,
    is_b2b_digital BOOLEAN DEFAULT FALSE,
    is_running_cost BOOLEAN DEFAULT FALSE,
    baseline_monthly DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Xero Transactions (detailed log)
CREATE TABLE IF NOT EXISTS xero_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE NOT NULL,
    account_id UUID REFERENCES xero_accounts(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    contact_name TEXT,
    is_revenue BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- 2. ENHANCED PLATFORM METRICS
-- ===========================================

-- Add new columns to existing social_metrics table
ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS subscribers INTEGER DEFAULT 0;
ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS yt_ad_revenue DECIMAL(15,2) DEFAULT 0;
ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS followers_gained INTEGER DEFAULT 0;
ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT FALSE;
ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS api_source TEXT DEFAULT 'api';

-- ===========================================
-- 3. CONTENT POSTS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS content_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'facebook')),
    external_id TEXT NOT NULL,
    post_type TEXT NOT NULL,
    title TEXT,
    published_at TIMESTAMPTZ,
    views BIGINT DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    yt_watch_time_minutes DECIMAL(15,2) DEFAULT 0,
    yt_avg_view_duration DECIMAL(10,2) DEFAULT 0,
    yt_ctr DECIMAL(5,4) DEFAULT 0,
    url TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, external_id)
);

-- ===========================================
-- 4. AUDIENCE DEMOGRAPHICS
-- ===========================================

CREATE TABLE IF NOT EXISTS audience_demographics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'facebook')),
    metric_date DATE NOT NULL,
    age_13_17_percent DECIMAL(5,2) DEFAULT 0,
    age_18_24_percent DECIMAL(5,2) DEFAULT 0,
    age_25_34_percent DECIMAL(5,2) DEFAULT 0,
    age_35_44_percent DECIMAL(5,2) DEFAULT 0,
    age_45_54_percent DECIMAL(5,2) DEFAULT 0,
    age_55_plus_percent DECIMAL(5,2) DEFAULT 0,
    gen_z_followers INTEGER DEFAULT 0,
    total_followers INTEGER DEFAULT 0,
    is_manual_entry BOOLEAN DEFAULT FALSE,
    api_source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, metric_date)
);

-- ===========================================
-- 5. KPI TARGETS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS kpi_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kpi_key TEXT UNIQUE NOT NULL,
    target_value DECIMAL(15,2) NOT NULL,
    year INTEGER NOT NULL DEFAULT 2026,
    category TEXT,
    display_name TEXT,
    unit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 2026 KPI Targets
INSERT INTO kpi_targets (kpi_key, target_value, year, category, display_name, unit) VALUES
    -- Financial
    ('revenue_cross_platform', 100000, 2026, 'financial', 'Cross-Platform Revenue', '£'),
    ('running_costs_saved', 75000, 2026, 'financial', 'Running Costs Saved', '£'),
    ('b2b_digital_sales', 50000, 2026, 'financial', 'B2B Digital Sales', '£'),

    -- Gen Z Audience
    ('gen_z_fb_ig_tiktok', 483722, 2026, 'audience', 'Gen Z (FB+IG+TikTok)', 'followers'),
    ('gen_z_youtube', 688500, 2026, 'audience', 'Gen Z (YouTube)', 'followers'),

    -- YouTube
    ('youtube_views', 5100000, 2026, 'youtube', 'Total Views', 'views'),
    ('youtube_revenue', 20000, 2026, 'youtube', 'Ad Revenue', '£'),
    ('youtube_ctr', 5.1, 2026, 'youtube', 'Impression CTR', '%'),
    ('youtube_subscribers', 78000, 2026, 'youtube', 'Subscribers', 'followers'),
    ('youtube_shorts_views', 33250000, 2026, 'youtube', 'Shorts Views', 'views'),
    ('youtube_engagement', 2.33, 2026, 'youtube', 'Video Engagement', '%'),
    ('youtube_shorts_engagement', 3.15, 2026, 'youtube', 'Shorts Engagement', '%'),
    ('youtube_avg_video_views', 2500, 2026, 'youtube', 'Avg Video Views', 'views'),
    ('youtube_avg_shorts_views', 6300, 2026, 'youtube', 'Avg Shorts Views', 'views'),
    ('youtube_price_per_post', 96, 2026, 'youtube', 'Est. Price Per Post', '£'),

    -- Instagram
    ('instagram_followers', 300000, 2026, 'instagram', 'Followers', 'followers'),
    ('instagram_engagement', 0.30, 2026, 'instagram', 'Engagement Rate', '%'),
    ('instagram_avg_reach_post', 127500, 2026, 'instagram', 'Avg Reach Per Post', 'reach'),
    ('instagram_avg_reach_story', 26250, 2026, 'instagram', 'Avg Reach Per Story', 'reach'),
    ('instagram_price_post', 4725, 2026, 'instagram', 'Est. Price Per Post', '£'),
    ('instagram_price_story', 566, 2026, 'instagram', 'Est. Price Per Story', '£'),

    -- TikTok
    ('tiktok_new_followers', 40000, 2026, 'tiktok', 'New Followers', 'followers'),
    ('tiktok_engagement', 6.25, 2026, 'tiktok', 'Engagement Rate', '%'),
    ('tiktok_reach_per_post', 3750, 2026, 'tiktok', 'Reach Per Post', 'reach'),
    ('tiktok_price_per_post', 100, 2026, 'tiktok', 'Est. Price Per Post', '£'),

    -- Facebook
    ('facebook_followers', 188000, 2026, 'facebook', 'Followers', 'followers'),
    ('facebook_revenue', 80000, 2026, 'facebook', 'Platform Revenue', '£'),
    ('facebook_total_views', 670000000, 2026, 'facebook', 'Total Views', 'views'),
    ('facebook_views_3s', 75000000, 2026, 'facebook', '3-Second Views', 'views'),
    ('facebook_views_1min', 11250000, 2026, 'facebook', '1-Minute Views', 'views')
ON CONFLICT (kpi_key) DO UPDATE SET
    target_value = EXCLUDED.target_value,
    display_name = EXCLUDED.display_name,
    unit = EXCLUDED.unit,
    updated_at = NOW();

-- ===========================================
-- 6. MANUAL METRICS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS manual_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_key TEXT NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_date DATE NOT NULL,
    platform TEXT,
    entered_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(metric_key, metric_date)
);

-- ===========================================
-- 7. API SYNC STATUS
-- ===========================================

CREATE TABLE IF NOT EXISTS api_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_name TEXT UNIQUE NOT NULL,
    last_sync_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_error TEXT,
    records_synced INTEGER DEFAULT 0,
    is_healthy BOOLEAN DEFAULT TRUE,
    requires_reauth BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default API statuses
INSERT INTO api_sync_status (api_name) VALUES
    ('xero'),
    ('youtube_data'),
    ('youtube_analytics'),
    ('instagram'),
    ('facebook'),
    ('tiktok')
ON CONFLICT (api_name) DO NOTHING;

-- ===========================================
-- 8. INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_financial_kpis_date ON financial_kpis(metric_date);
CREATE INDEX IF NOT EXISTS idx_content_posts_platform ON content_posts(platform);
CREATE INDEX IF NOT EXISTS idx_content_posts_published ON content_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_content_posts_type ON content_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_audience_demographics_platform ON audience_demographics(platform);
CREATE INDEX IF NOT EXISTS idx_manual_metrics_key ON manual_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_xero_transactions_date ON xero_transactions(transaction_date);

-- ===========================================
-- 9. ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE financial_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE xero_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all financial_kpis" ON financial_kpis FOR ALL USING (true);
CREATE POLICY "Allow all xero_accounts" ON xero_accounts FOR ALL USING (true);
CREATE POLICY "Allow all xero_transactions" ON xero_transactions FOR ALL USING (true);
CREATE POLICY "Allow all content_posts" ON content_posts FOR ALL USING (true);
CREATE POLICY "Allow all audience_demographics" ON audience_demographics FOR ALL USING (true);
CREATE POLICY "Allow all kpi_targets" ON kpi_targets FOR ALL USING (true);
CREATE POLICY "Allow all manual_metrics" ON manual_metrics FOR ALL USING (true);
CREATE POLICY "Allow all api_sync_status" ON api_sync_status FOR ALL USING (true);

-- ===========================================
-- 10. UPDATED DASHBOARD VIEW
-- ===========================================

DROP VIEW IF EXISTS dashboard_stats;
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    -- Deals
    (SELECT COUNT(*) FROM deals WHERE stage NOT IN ('Won', 'Lost')) as active_deals,
    (SELECT COALESCE(SUM(deal_value), 0) FROM deals WHERE stage NOT IN ('Won', 'Lost')) as pipeline_value,

    -- Invoices
    (SELECT COUNT(*) FROM invoices WHERE status = 'overdue') as overdue_invoices,
    (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'paid' AND issue_date >= date_trunc('year', CURRENT_DATE)) as ytd_revenue,

    -- Financial KPIs
    (SELECT COALESCE(cross_platform_revenue, 0) FROM financial_kpis ORDER BY metric_date DESC LIMIT 1) as cross_platform_revenue,
    (SELECT COALESCE(running_costs_saved, 0) FROM financial_kpis ORDER BY metric_date DESC LIMIT 1) as running_costs_saved,
    (SELECT COALESCE(b2b_digital_sales, 0) FROM financial_kpis ORDER BY metric_date DESC LIMIT 1) as b2b_digital_sales,

    -- Social Metrics (latest per platform)
    (SELECT COALESCE(SUM(followers), 0) FROM social_metrics sm
     WHERE metric_date = (SELECT MAX(metric_date) FROM social_metrics WHERE platform = sm.platform)) as total_audience,

    -- Gen Z Audience
    (SELECT COALESCE(SUM(gen_z_followers), 0) FROM audience_demographics ad
     WHERE metric_date = (SELECT MAX(metric_date) FROM audience_demographics WHERE platform = ad.platform)) as total_gen_z_audience,

    -- ROI
    (SELECT COALESCE(SUM(time_saved_hours), 0) FROM roi_metrics WHERE metric_date >= CURRENT_DATE - 30) as monthly_time_saved;

-- ===========================================
-- 11. TRIGGERS
-- ===========================================

DROP TRIGGER IF EXISTS update_financial_kpis_timestamp ON financial_kpis;
CREATE TRIGGER update_financial_kpis_timestamp BEFORE UPDATE ON financial_kpis FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_xero_accounts_timestamp ON xero_accounts;
CREATE TRIGGER update_xero_accounts_timestamp BEFORE UPDATE ON xero_accounts FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_content_posts_timestamp ON content_posts;
CREATE TRIGGER update_content_posts_timestamp BEFORE UPDATE ON content_posts FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_kpi_targets_timestamp ON kpi_targets;
CREATE TRIGGER update_kpi_targets_timestamp BEFORE UPDATE ON kpi_targets FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_api_sync_status_timestamp ON api_sync_status;
CREATE TRIGGER update_api_sync_status_timestamp BEFORE UPDATE ON api_sync_status FOR EACH ROW EXECUTE FUNCTION update_timestamp();
