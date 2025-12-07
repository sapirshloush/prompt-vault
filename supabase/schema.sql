-- PromptVault Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#6366f1',
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags Table
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6366f1',
    is_auto_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompts Table
CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'other',
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    effectiveness_score INTEGER CHECK (effectiveness_score >= 1 AND effectiveness_score <= 10),
    use_count INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT false,
    current_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt Versions Table (for version control)
CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    change_notes TEXT,
    effectiveness_score INTEGER CHECK (effectiveness_score >= 1 AND effectiveness_score <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prompt_id, version_number)
);

-- Prompt Tags Junction Table
CREATE TABLE IF NOT EXISTS prompt_tags (
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (prompt_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompts_source ON prompts(source);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_favorite ON prompts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_prompts_created ON prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_updated ON prompts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Full-text search index on prompts
CREATE INDEX IF NOT EXISTS idx_prompts_search ON prompts 
USING GIN (to_tsvector('english', title || ' ' || content));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts;
CREATE TRIGGER update_prompts_updated_at
    BEFORE UPDATE ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO categories (name, description, icon, color) VALUES
    ('Copywriting', 'Marketing copy, ads, hooks', '✍️', '#ef4444'),
    ('Coding', 'Code generation, debugging, reviews', '💻', '#3b82f6'),
    ('Analysis', 'Data analysis, research, insights', '📊', '#10b981'),
    ('Creative', 'Brainstorming, ideation, design', '🎨', '#8b5cf6'),
    ('Automation', 'Workflows, scripts, integrations', '⚡', '#f59e0b'),
    ('Communication', 'Emails, messages, presentations', '💬', '#ec4899'),
    ('Learning', 'Explanations, summaries, tutorials', '📚', '#06b6d4')
ON CONFLICT DO NOTHING;

-- Insert some starter tags
INSERT INTO tags (name, color, is_auto_generated) VALUES
    ('hooks', '#ef4444', false),
    ('automation', '#f59e0b', false),
    ('visual-identity', '#8b5cf6', false),
    ('concerts', '#ec4899', false),
    ('copywriting', '#10b981', false),
    ('code-review', '#3b82f6', false),
    ('debugging', '#6366f1', false),
    ('brainstorming', '#14b8a6', false)
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) - Enable for future multi-user support
-- For now, we'll keep it simple without auth
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_tags ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (personal use)
-- You can add user-specific policies later for multi-user support
CREATE POLICY "Allow all for prompts" ON prompts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tags" ON tags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for prompt_versions" ON prompt_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for prompt_tags" ON prompt_tags FOR ALL USING (true) WITH CHECK (true);

