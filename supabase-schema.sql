-- ===========================================
-- EXECUTIVE DASHBOARD - SUPABASE SCHEMA (UPDATED)
-- ===========================================
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'qualified', 'proposal', 'won', 'lost')),
    source TEXT,
    estimated_value DECIMAL DEFAULT 0,
    notes TEXT,
    last_contact_date TIMESTAMPTZ,
    external_id TEXT, -- Added for Monday/Xero sync
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals Table (Renamed from Projects, Syncs with Monday.com)
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    external_id TEXT UNIQUE, -- Monday Item ID
    source TEXT DEFAULT 'monday',
    stage TEXT DEFAULT 'Lead', -- Lead, Negotiation, Contract Sent, Won, Lost
    deal_value DECIMAL DEFAULT 0,
    probability INTEGER DEFAULT 0, -- 0-100%
    platform TEXT, -- YouTube, TikTok, etc. (if applicable to the deal)
    status TEXT DEFAULT 'active', -- internal status
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices Table (Syncs with Xero)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'voided')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    external_id TEXT UNIQUE, -- For Xero Invoice ID
    source TEXT DEFAULT 'xero',
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Media Metrics Table (Updated for Granular KPIs)
CREATE TABLE IF NOT EXISTS social_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'youtube', 'tiktok')),
    metric_date DATE NOT NULL,
    followers INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagement DECIMAL DEFAULT 0, -- Changed to decimal for rates or raw counts
    posts_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    
    -- New Granular KPIs
    reach INTEGER DEFAULT 0,
    ctr DECIMAL DEFAULT 0, -- Click-Through Rate (%)
    views_3s INTEGER DEFAULT 0, -- 3-second views (FB/TikTok)
    views_1min INTEGER DEFAULT 0, -- 1-minute views (FB)
    for_you_rate DECIMAL DEFAULT 0, -- "For You" Feed % (TikTok)
    
    -- Round 2 KPIs
    shorts_views INTEGER DEFAULT 0,
    video_views INTEGER DEFAULT 0, -- Regular video views (not shorts)
    video_engagement_rate DECIMAL DEFAULT 0,
    shorts_engagement_rate DECIMAL DEFAULT 0,
    avg_video_views INTEGER DEFAULT 0,
    avg_shorts_views INTEGER DEFAULT 0,
    story_reach INTEGER DEFAULT 0,
    story_impressions INTEGER DEFAULT 0, -- Facebook story impressions (manual input - not available via API)
    estimated_price_post DECIMAL(15,2) DEFAULT 0,
    estimated_price_story DECIMAL(15,2) DEFAULT 0,
    platform_revenue DECIMAL(15,2) DEFAULT 0,

    -- YouTube specific
    subscribers INTEGER DEFAULT 0, -- Net subscribers gained
    yt_ad_revenue DECIMAL(15,2) DEFAULT 0,
    followers_gained INTEGER DEFAULT 0, -- Raw followers/subscribers gained

    -- Metadata
    api_source TEXT DEFAULT 'api', -- 'api' or 'manual'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(platform, metric_date)
);

-- Add columns if table already exists (run these if upgrading)
-- ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS video_views INTEGER DEFAULT 0;
-- ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS subscribers INTEGER DEFAULT 0;
-- ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS yt_ad_revenue DECIMAL(15,2) DEFAULT 0;
-- ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS followers_gained INTEGER DEFAULT 0;
-- ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS api_source TEXT DEFAULT 'api';
-- ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS story_impressions INTEGER DEFAULT 0;

-- ROI Metrics Table
CREATE TABLE IF NOT EXISTS roi_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE UNIQUE NOT NULL,
    time_saved_hours DECIMAL DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    tasks_synced INTEGER DEFAULT 0,
    events_synced INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation Logs Table
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type TEXT NOT NULL,
    details TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_external ON deals(external_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_external ON invoices(external_id);
CREATE INDEX IF NOT EXISTS idx_social_platform ON social_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_automation_created ON automation_logs(created_at);

-- Dashboard statistics view
DROP VIEW IF EXISTS dashboard_stats;
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM clients WHERE status IN ('lead', 'qualified')) as active_leads,
    (SELECT COUNT(*) FROM deals WHERE stage NOT IN ('Won', 'Lost')) as active_deals,
    (SELECT COALESCE(SUM(deal_value), 0) FROM deals WHERE stage NOT IN ('Won', 'Lost')) as pipeline_value,
    (SELECT COUNT(*) FROM invoices WHERE status = 'overdue') as overdue_invoices,
    (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'overdue') as overdue_amount,
    (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'paid' AND issue_date >= date_trunc('year', CURRENT_DATE)) as ytd_revenue,
    (SELECT COALESCE(SUM(followers), 0) FROM social_metrics WHERE metric_date = (SELECT MAX(metric_date) FROM social_metrics)) as total_audience,
    (SELECT COALESCE(SUM(time_saved_hours), 0) FROM roi_metrics WHERE metric_date >= CURRENT_DATE - 30) as monthly_time_saved;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clients_timestamp ON clients;
CREATE TRIGGER update_clients_timestamp BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_deals_timestamp ON deals;
CREATE TRIGGER update_deals_timestamp BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_invoices_timestamp ON invoices;
CREATE TRIGGER update_invoices_timestamp BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Auto-update invoice status to overdue
CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS void AS $$
BEGIN
    UPDATE invoices 
    SET status = 'overdue' 
    WHERE status = 'sent' 
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (allow all for now)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all clients" ON clients;
CREATE POLICY "Allow all clients" ON clients FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all deals" ON deals;
CREATE POLICY "Allow all deals" ON deals FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all invoices" ON invoices;
CREATE POLICY "Allow all invoices" ON invoices FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all social" ON social_metrics;
CREATE POLICY "Allow all social" ON social_metrics FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all roi" ON roi_metrics;
CREATE POLICY "Allow all roi" ON roi_metrics FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all logs" ON automation_logs;
CREATE POLICY "Allow all logs" ON automation_logs FOR ALL USING (true);


-- Settings Table (for dynamic API configuration)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all settings" ON settings;
CREATE POLICY "Allow all settings" ON settings FOR ALL USING (true);

-- Insert default empty settings keys if they don't exist
INSERT INTO settings (key, description) VALUES
    ('monday_api_token', 'Monday.com API Token'),
    ('xero_client_id', 'Xero Client ID'),
    ('facebook_access_token', 'Facebook Graph API Token'),
    ('gmail_sender_email', 'Gmail Sender Address'),
    ('ollama_base_url', 'Ollama API URL'),
    ('ollama_model', 'Ollama Model Name')
ON CONFLICT DO NOTHING;
