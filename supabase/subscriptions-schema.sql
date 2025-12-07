-- Subscriptions Schema for PromptVault
-- Run this in Supabase SQL Editor

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan_type VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'lifetime'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  ai_analyses_used INTEGER DEFAULT 0,
  ai_analyses_limit INTEGER DEFAULT 10, -- Free tier limit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update subscriptions (via webhook)
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Function to auto-create subscription for new users
CREATE OR REPLACE FUNCTION create_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan_type, status, ai_analyses_limit)
  VALUES (NEW.id, 'free', 'active', 10)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_subscription();

-- Function to increment AI usage
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID)
RETURNS TABLE(can_use BOOLEAN, uses_remaining INTEGER) AS $$
DECLARE
  v_plan_type VARCHAR(50);
  v_used INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get current usage
  SELECT plan_type, ai_analyses_used, ai_analyses_limit
  INTO v_plan_type, v_used, v_limit
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Pro users have unlimited
  IF v_plan_type = 'pro' OR v_plan_type = 'lifetime' THEN
    RETURN QUERY SELECT TRUE, -1;
    RETURN;
  END IF;
  
  -- Check if under limit
  IF v_used < v_limit THEN
    UPDATE subscriptions
    SET ai_analyses_used = ai_analyses_used + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT TRUE, (v_limit - v_used - 1);
  ELSE
    RETURN QUERY SELECT FALSE, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly usage (call via cron)
CREATE OR REPLACE FUNCTION reset_monthly_ai_usage()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET ai_analyses_used = 0,
      updated_at = NOW()
  WHERE plan_type = 'free';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

