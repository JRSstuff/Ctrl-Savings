# Allowance Tracker - Supabase SQL & Schema

Copy and run this in your **Supabase SQL Editor**:

```sql
-- 1. Create the app_users table (No emails needed, just username & password)
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  total_budget NUMERIC DEFAULT 980.00,
  available_budget NUMERIC DEFAULT 215.60
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow API insert" ON public.app_users;
DROP POLICY IF EXISTS "Allow API select" ON public.app_users;

-- 4. Create fresh policies
CREATE POLICY "Allow API insert" ON public.app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow API select" ON public.app_users FOR SELECT USING (true);
```
