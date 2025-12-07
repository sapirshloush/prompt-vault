-- Shareable Collections Schema
-- Run this in Supabase SQL Editor

-- Add share_token to collections for unique shareable links
ALTER TABLE collections 
ADD COLUMN IF NOT EXISTS share_token VARCHAR(32) UNIQUE;

-- Create index for fast lookup by share token
CREATE INDEX IF NOT EXISTS idx_collections_share_token ON collections(share_token);

-- Function to generate a random share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(32) AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Update RLS policy to allow viewing public collections by share token
DROP POLICY IF EXISTS "Anyone can view shared collections" ON collections;
CREATE POLICY "Anyone can view shared collections" ON collections
  FOR SELECT USING (
    auth.uid() = user_id 
    OR (is_public = TRUE AND share_token IS NOT NULL)
  );

-- Allow anyone to view prompts in shared collections
DROP POLICY IF EXISTS "Anyone can view prompts in shared collections" ON prompts;
CREATE POLICY "Anyone can view prompts in shared collections" ON prompts
  FOR SELECT USING (
    auth.uid() = user_id 
    OR collection_id IN (
      SELECT id FROM collections 
      WHERE is_public = TRUE AND share_token IS NOT NULL
    )
  );

