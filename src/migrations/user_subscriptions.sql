-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  last_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subscription_id)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Create RLS policies for user_subscriptions table
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to view only their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow service role to manage all subscriptions
CREATE POLICY "Service role can manage all subscriptions"
  ON user_subscriptions
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Create pricing_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  monthly_usd NUMERIC NOT NULL,
  monthly_coins INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pricing plans if they don't exist
INSERT INTO pricing_plans (name, description, monthly_usd, monthly_coins)
VALUES 
  ('Free', 'Basic access with limited features', 0, 0),
  ('Pro', 'Advanced features for professionals', 9.99, 1000),
  ('Enterprise', 'Full access for teams and businesses', 19.99, 3000)
ON CONFLICT (name) DO NOTHING;
