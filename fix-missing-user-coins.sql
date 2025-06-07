-- Manual SQL commands to initialize the missing user coins
-- Run these in the Supabase SQL Editor

-- First, check if the user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE id = 'd4539379-f3d4-4b7e-9012-30fd88680c25';

-- Check if they already have coins (should return no rows)
SELECT * 
FROM public.user_coins 
WHERE user_id = 'd4539379-f3d4-4b7e-9012-30fd88680c25';

-- Initialize coins for this specific user
INSERT INTO public.user_coins (user_id, balance, total_earned, total_spent, subscription_tier, last_coin_refresh)
VALUES (
  'd4539379-f3d4-4b7e-9012-30fd88680c25',
  50,      -- Initial balance
  50,      -- Total earned
  0,       -- Total spent
  'FREE',  -- Subscription tier
  NOW()    -- Last refresh timestamp
)
ON CONFLICT (user_id) DO NOTHING;

-- Record the welcome bonus transaction
INSERT INTO public.coin_transactions (user_id, transaction_id, type, amount, description, created_at)
VALUES (
  'd4539379-f3d4-4b7e-9012-30fd88680c25',
  'welcome_retroactive_' || extract(epoch from now())::bigint,
  'EARNED',
  50,
  'Welcome bonus (retroactive initialization)',
  NOW()
);

-- Verify the insertion worked
SELECT * 
FROM public.user_coins 
WHERE user_id = 'd4539379-f3d4-4b7e-9012-30fd88680c25';

-- Also check the transaction was recorded
SELECT * 
FROM public.coin_transactions 
WHERE user_id = 'd4539379-f3d4-4b7e-9012-30fd88680c25'
ORDER BY created_at DESC;
