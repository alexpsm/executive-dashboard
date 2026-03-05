-- Migration: Rebuild deals table to match Monday.com Deals board structure exactly
-- Run this in Supabase SQL Editor

-- Drop old deals table and recreate with exact Monday.com structure
DROP TABLE IF EXISTS deals CASCADE;

CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Monday.com identifiers
    external_id TEXT UNIQUE NOT NULL,           -- Monday Item ID
    source TEXT DEFAULT 'monday',

    -- Core fields
    name TEXT NOT NULL,                          -- Deal name

    -- Groups (Pipeline Stage in Monday)
    group_id TEXT,                               -- Monday group ID
    group_name TEXT NOT NULL,                    -- "Deals Won", "Proposal Submitted", etc.
    group_color TEXT,                            -- Hex color code

    -- Stage status (separate from group)
    stage TEXT DEFAULT 'New',                    -- New, Discovery, Proposal, Negotiation, Won, Lost
    stage_color TEXT,                            -- Hex color for stage badge

    -- Update notes
    update_notes TEXT,                           -- Latest update/notes

    -- Financial
    deal_value DECIMAL(15,2) DEFAULT 0,          -- Deal value in £
    close_probability INTEGER DEFAULT 0,          -- 0-100%
    forecast_value DECIMAL(15,2) DEFAULT 0,       -- Calculated: deal_value * probability

    -- Dates
    expected_close_date DATE,
    last_interaction_date DATE,

    -- Related records (stored as text since we can't join Monday boards)
    contact_name TEXT,
    account_name TEXT,
    owner_name TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_deals_group_name ON deals(group_name);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_external_id ON deals(external_id);

-- Insert stage color mappings for reference
CREATE TABLE IF NOT EXISTS deal_stage_colors (
    stage TEXT PRIMARY KEY,
    color TEXT NOT NULL,
    position INTEGER DEFAULT 0
);

INSERT INTO deal_stage_colors (stage, color, position) VALUES
    ('New', '#5559df', 0),
    ('Discovery', '#579bfc', 1),
    ('Proposal', '#66ccff', 2),
    ('Negotiation', '#4eccc6', 3),
    ('Won', '#00c875', 4),
    ('Lost', '#df2f4a', 5)
ON CONFLICT (stage) DO UPDATE SET color = EXCLUDED.color, position = EXCLUDED.position;

-- Insert group color mappings
CREATE TABLE IF NOT EXISTS deal_group_colors (
    group_id TEXT PRIMARY KEY,
    group_name TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER DEFAULT 0
);

INSERT INTO deal_group_colors (group_id, group_name, color, position) VALUES
    ('closed', 'Deals Won', '#00c875', 0),
    ('topics', 'Proposal Submitted', '#0086c0', 1),
    ('group_mkw9s2by', 'Active Conversations', '#bb3354', 2),
    ('group_mkwa7hqn', 'Inactive conversations', '#579bfc', 3),
    ('group_mksmnq6c', 'Deals pitched and lost', '#579bfc', 4)
ON CONFLICT (group_id) DO UPDATE SET
    group_name = EXCLUDED.group_name,
    color = EXCLUDED.color,
    position = EXCLUDED.position;

-- Verify structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'deals'
ORDER BY ordinal_position;
