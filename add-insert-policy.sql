-- Add INSERT policy for user_coins table to allow automatic initialization
-- This allows authenticated users to insert their own coin records

DROP POLICY IF EXISTS "Users can insert their own coins" ON public.user_coins;
CREATE POLICY "Users can insert their own coins"
  ON public.user_coins FOR INSERT
  WITH CHECK (auth.uid() = user_id);
