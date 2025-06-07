-- Create user_coins table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_coins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 50 CHECK (balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE user_coins ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own coins" ON user_coins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own coins" ON user_coins
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coins" ON user_coins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert some sample data for testing (optional)
-- Note: Replace with actual user IDs if needed
INSERT INTO user_coins (user_id, balance) VALUES 
  ('00000000-0000-0000-0000-000000000000', 100)
ON CONFLICT (user_id) DO NOTHING;
