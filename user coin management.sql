
-- profiles
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_coins
ALTER TABLE user_coins DROP CONSTRAINT user_coins_user_id_fkey;
ALTER TABLE user_coins ADD CONSTRAINT user_coins_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- coin_transactions
ALTER TABLE coin_transactions DROP CONSTRAINT coin_transactions_user_id_fkey;
ALTER TABLE coin_transactions ADD CONSTRAINT coin_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
