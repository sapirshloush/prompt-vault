-- Collections Schema for PromptVault
-- Run this in Supabase SQL Editor

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10) DEFAULT '📁',
  color VARCHAR(20) DEFAULT '#6366f1',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add collection_id to prompts table (optional relationship)
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_collection_id ON prompts(collection_id);

-- Enable RLS on collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections
-- Users can only see their own collections (or public ones)
CREATE POLICY "Users can view own collections" ON collections
  FOR SELECT USING (
    auth.uid() = user_id OR is_public = TRUE
  );

-- Users can only insert their own collections
CREATE POLICY "Users can create own collections" ON collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own collections
CREATE POLICY "Users can update own collections" ON collections
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own collections
CREATE POLICY "Users can delete own collections" ON collections
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_collection_updated_at ON collections;
CREATE TRIGGER trigger_update_collection_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_updated_at();

