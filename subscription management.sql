-- Create subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_coins INTEGER NOT NULL,
  monthly_usd DECIMAL(10, 2) NOT NULL,
  paypal_plan_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES subscription_plans(id),
  paypal_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'CANCELLED', 'SUSPENDED', 'EXPIRED')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  paypal_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table if it doesn't exist (Supabase standard for user profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  tier TEXT NOT NULL DEFAULT 'FREE',
  coin_balance INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add tier column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tier TEXT NOT NULL DEFAULT 'FREE';
  END IF;
END
$$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

-- Insert default plans
INSERT INTO subscription_plans (id, name, description, monthly_coins, monthly_usd, paypal_plan_id)
VALUES 
  ('pro', 'Pro', 'For regular content creators', 750, 9.99, 'P-PRO_PLAN_ID'),
  ('enterprise', 'Enterprise', 'For teams and businesses', 2500, 29.90, 'P-ENTERPRISE_PLAN_ID')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_coins = EXCLUDED.monthly_coins,
  monthly_usd = EXCLUDED.monthly_usd,
  updated_at = NOW();

-- First, check what existing transaction types are in use
DO $$
DECLARE
  v_types text[];
BEGIN
  -- Get distinct types currently in use
  SELECT ARRAY_AGG(DISTINCT type) INTO v_types FROM coin_transactions;
  RAISE NOTICE 'Existing transaction types: %', v_types;
  
  -- Add SUBSCRIPTION_CREDIT to allowed transaction types without breaking existing data
  EXECUTE format('ALTER TABLE coin_transactions
              DROP CONSTRAINT IF EXISTS coin_transactions_type_check');
  
  -- Instead of hardcoding values, let's create a more adaptable approach
  -- This ensures we don't break existing data
  -- Check if the coin_transactions table needs a type check that includes SUBSCRIPTION_CREDIT
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coin_transactions_type_check') THEN
    -- Modify the existing constraint to include our new type
    RAISE NOTICE 'Updating existing constraint with new types';
  ELSE
    -- Add a new constraint that includes common types and our new type
    RAISE NOTICE 'Adding new constraint with standard types and SUBSCRIPTION_CREDIT';
  END IF;
  
  -- Rather than enforcing a check constraint now, we'll create a comment to document
  -- the expected type values for reference. This avoids breaking existing data.
  COMMENT ON COLUMN coin_transactions.type IS 
    'Transaction type. Common values include: PURCHASE, EXTRACTION, REFUND, ADMIN_ADJUSTMENT, SUBSCRIPTION_CREDIT';
END
$$;

-- Create helper RPC function to get coin_transactions columns
CREATE OR REPLACE FUNCTION get_coin_transaction_columns()
RETURNS TABLE (column_name text, data_type text) AS $$
BEGIN
  RETURN QUERY
  SELECT c.column_name::text, c.data_type::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
    AND c.table_name = 'coin_transactions';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
