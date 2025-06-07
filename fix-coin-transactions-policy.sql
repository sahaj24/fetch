-- Add missing INSERT policy for coin_transactions table
-- This allows authenticated users to insert their own transaction records

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.coin_transactions;
CREATE POLICY "Users can insert their own transactions"
  ON public.coin_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Also add UPDATE policy if needed for future operations
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.coin_transactions;
CREATE POLICY "Users can update their own transactions"
  ON public.coin_transactions FOR UPDATE
  USING (auth.uid() = user_id);
