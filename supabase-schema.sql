-- =============================
-- PROFILES TABLE
-- =============================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::JSONB
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- =============================
-- USER COINS TABLE
-- =============================

CREATE TABLE IF NOT EXISTS public.user_coins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  subscription_tier TEXT DEFAULT 'FREE',
  last_coin_refresh TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own coins" ON public.user_coins;
CREATE POLICY "Users can read their own coins"
  ON public.user_coins FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own coins via functions" ON public.user_coins;
CREATE POLICY "Users can update their own coins via functions"
  ON public.user_coins FOR UPDATE
  USING (auth.uid() = user_id);


-- =============================
-- COIN TRANSACTIONS TABLE
-- =============================

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  transaction_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coin_transactions_user_id_idx ON public.coin_transactions(user_id);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own transactions" ON public.coin_transactions;
CREATE POLICY "Users can read their own transactions"
  ON public.coin_transactions FOR SELECT
  USING (auth.uid() = user_id);


-- =============================
-- COIN MANAGEMENT FUNCTIONS
-- =============================

-- Add Coins
CREATE OR REPLACE FUNCTION public.add_user_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_id TEXT,
  p_description TEXT,
  p_created_at TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_coins (user_id, balance, total_earned, total_spent, last_coin_refresh)
  VALUES (p_user_id, p_amount, p_amount, 0, p_created_at)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    balance = user_coins.balance + p_amount,
    total_earned = user_coins.total_earned + p_amount;

  INSERT INTO public.coin_transactions (user_id, transaction_id, type, amount, description, created_at)
  VALUES (p_user_id, p_transaction_id, 'EARNED', p_amount, p_description, p_created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Spend Coins
CREATE OR REPLACE FUNCTION public.spend_user_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_id TEXT,
  p_description TEXT,
  p_created_at TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  SELECT balance INTO v_current_balance FROM public.user_coins WHERE user_id = p_user_id;

  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Not enough coins';
  END IF;

  UPDATE public.user_coins
  SET 
    balance = balance - p_amount,
    total_spent = total_spent + p_amount
  WHERE user_id = p_user_id;

  INSERT INTO public.coin_transactions (user_id, transaction_id, type, amount, description, created_at)
  VALUES (p_user_id, p_transaction_id, 'SPENT', p_amount, p_description, p_created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Monthly Refresh
CREATE OR REPLACE FUNCTION public.refresh_monthly_coins(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  PERFORM public.add_user_coins(
    p_user_id,
    p_amount,
    'monthly_refresh_' || extract(epoch from now())::bigint,
    'Monthly coins refresh',
    now()
  );

  UPDATE public.user_coins
  SET last_coin_refresh = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================
-- HANDLE NEW USER TRIGGER
-- =============================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _display_name TEXT;
  _avatar_url TEXT;
BEGIN
  _display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(COALESCE(NEW.email, 'user'), '@', 1)
  );
  _avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- Insert user profile
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    _display_name,
    _avatar_url
  );

  -- Give the user 50 starting coins
  INSERT INTO public.user_coins (user_id, balance, total_earned, total_spent)
  VALUES (
    NEW.id,
    50,
    50,
    0
  );

  -- Log signup coin bonus
  INSERT INTO public.coin_transactions (user_id, transaction_id, type, amount, description)
  VALUES (
    NEW.id,
    'initial_signup_bonus',
    'EARNED',
    50,
    'Signup bonus'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
