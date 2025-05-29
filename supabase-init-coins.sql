-- This file contains an additional trigger to automatically initialize user coins
-- You can run these commands in the Supabase SQL editor

-- Create a function to handle new user creation and initialize coins
CREATE OR REPLACE FUNCTION public.handle_new_user_coins()
RETURNS TRIGGER AS $$
DECLARE
  transaction_id TEXT;
BEGIN
  -- Generate a transaction ID for the welcome bonus
  transaction_id := 'welcome_' || extract(epoch from now())::bigint;
  
  -- Insert a record into user_coins with 50 coin balance
  INSERT INTO public.user_coins (user_id, balance, total_earned, total_spent, subscription_tier, last_coin_refresh)
  VALUES (
    NEW.id, -- User ID from the auth.users table
    50,     -- Initial balance of 50 coins
    50,     -- Total earned starts at 50
    0,      -- Total spent starts at 0
    'FREE', -- Default subscription tier
    now()   -- Current timestamp for last refresh
  );
  
  -- Record the welcome bonus transaction
  INSERT INTO public.coin_transactions (user_id, transaction_id, type, amount, description, created_at)
  VALUES (
    NEW.id,
    transaction_id,
    'EARNED',
    50,
    'Welcome bonus',
    now()
  );
  
  -- Log that coins were initialized (visible in Supabase logs)
  RAISE LOG 'Initialized 50 coins for new user: %', NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new trigger that runs after user creation
DROP TRIGGER IF EXISTS on_auth_user_created_init_coins ON auth.users;
CREATE TRIGGER on_auth_user_created_init_coins
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_coins();

-- Note: This trigger works alongside the existing profile creation trigger
-- They work independently, so if one fails, the other can still succeed