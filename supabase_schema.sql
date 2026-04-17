-- Execute this SQL in your Supabase SQL Editor

-- 1. Create trades table
CREATE TABLE trades (
  id UUID DEFAULT auth.uid() NOT NULL,
  trade_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticker TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL')),
  price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW' CHECK (currency IN ('KRW', 'USD')),
  trade_date DATE NOT NULL,
  notes TEXT,
  sector TEXT DEFAULT 'Uncategorized',
  account TEXT DEFAULT 'Default',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Setup Row Level Security (RLS)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only insert their own trades."
  ON trades FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can only view their own trades."
  ON trades FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can only update their own trades."
  ON trades FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can only delete their own trades."
  ON trades FOR DELETE
  USING (auth.uid() = id);
