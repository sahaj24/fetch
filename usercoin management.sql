-- Create a function to handle new user registrations automatically
CREATE OR REPLACE FUNCTION public.handle_new_user_coins()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new record into user_coins table with 50 coins
  INSERT INTO public.user_coins (user_id, balance, created_at)
  VALUES (NEW.id, 50, NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger that runs after a new user is inserted
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_coins();
  
-- Function to ensure users have coins (can be run for existing users)
CREATE OR REPLACE FUNCTION public.ensure_user_has_coins(user_uuid UUID, initial_coins INTEGER DEFAULT 50)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_coins (user_id, balance, created_at)
  VALUES (user_uuid, initial_coins, NOW())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to manually run in SQL Editor to fix all existing users
CREATE OR REPLACE FUNCTION public.ensure_all_users_have_coins(initial_coins INTEGER DEFAULT 50)
RETURNS INTEGER AS $$
DECLARE
  user_count INTEGER := 0;
BEGIN
  -- Add coins for all existing users who don't have coins yet
  INSERT INTO public.user_coins (user_id, balance, created_at)
  SELECT id, initial_coins, NOW() 
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_coins c WHERE c.user_id = u.id
  );
  
  GET DIAGNOSTICS user_count = ROW_COUNT;
  RETURN user_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USAGE:
-- Run this in the SQL Editor of your Supabase project:
-- SELECT ensure_all_users_have_coins();
-- It will return the number of users that were updated
