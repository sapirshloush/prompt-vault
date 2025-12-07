-- PromptVault Authentication Migration
-- Run this in your Supabase SQL Editor to enable user-based security

-- Step 1: Add user_id column to prompts if not exists
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add user_id to prompt_versions
ALTER TABLE prompt_versions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Create index for faster user queries
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_user_id ON prompt_versions(user_id);

-- Step 4: Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all for prompts" ON prompts;
DROP POLICY IF EXISTS "Allow all for categories" ON categories;
DROP POLICY IF EXISTS "Allow all for tags" ON tags;
DROP POLICY IF EXISTS "Allow all for prompt_versions" ON prompt_versions;
DROP POLICY IF EXISTS "Allow all for prompt_tags" ON prompt_tags;

-- Step 5: Create secure RLS policies for prompts
-- Users can only see their own prompts
CREATE POLICY "Users can view own prompts" ON prompts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own prompts" ON prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts" ON prompts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts" ON prompts
    FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Create secure RLS policies for prompt_versions
CREATE POLICY "Users can view own versions" ON prompt_versions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own versions" ON prompt_versions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 7: Categories are shared (read-only for users, admin can manage)
CREATE POLICY "Anyone can view categories" ON categories
    FOR SELECT USING (true);

-- Step 8: Tags are shared but users can create
CREATE POLICY "Anyone can view tags" ON tags
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tags" ON tags
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Step 9: Prompt tags follow prompt ownership
CREATE POLICY "Users can view own prompt_tags" ON prompt_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM prompts 
            WHERE prompts.id = prompt_tags.prompt_id 
            AND prompts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own prompt_tags" ON prompt_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM prompts 
            WHERE prompts.id = prompt_tags.prompt_id 
            AND prompts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own prompt_tags" ON prompt_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM prompts 
            WHERE prompts.id = prompt_tags.prompt_id 
            AND prompts.user_id = auth.uid()
        )
    );

-- Step 10: Update existing prompts to belong to the first user (you!)
-- IMPORTANT: Run this AFTER you've logged in once to create your user
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users table
-- You can find it by running: SELECT id FROM auth.users LIMIT 1;

-- UPDATE prompts SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
-- UPDATE prompt_versions SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;

-- ============================================
-- IMPORTANT: After running this migration:
-- 1. Log into the app to create your user
-- 2. Run: SELECT id FROM auth.users LIMIT 1;
-- 3. Copy that ID and run:
--    UPDATE prompts SET user_id = 'paste-id-here' WHERE user_id IS NULL;
--    UPDATE prompt_versions SET user_id = 'paste-id-here' WHERE user_id IS NULL;
-- ============================================

