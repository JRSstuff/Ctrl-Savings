# Ctrl+Savings - Complete Database Architecture & Schema

This document maps the entire PostgreSQL database on Supabase for **Ctrl+Savings**, detailing all tables, relationships, constraints, indexes, Row-Level Security (RLS) policies, and how data flows.

---

## 1. Architectural Overview & Entity-Relationship Map

```
┌────────────────────────────────────────────────────────┐
│                   public.app_users                     │
├───────────────────────┬────────────────────────────────┤
│ id (UUID, PK)         │ gen_random_uuid()              │
│ username (TEXT)       │ UNIQUE, lowercase, 3-30 chars  │
│ password (TEXT)       │ SHA-256 salted hash            │
│ first_name (TEXT)     │ User given name                │
│ middle_name (TEXT)    │ Optional middle name           │
│ last_name (TEXT)      │ User family name               │
│ date_of_birth (DATE)  │ YYYY-MM-DD format              │
│ total_budget (NUM)    │ Default: 0.00                  │
│ available_budget(NUM) │ Default: 0.00                  │
│ created_at (TIMESTAMPTZ) Default: timezone('utc', now())│
└───────────────────────┴────────────────────────────────┘
         │                                       │
         │ 1 : N (Transactions)                  │ 1 : N (Allowance Cycles)
         ▼                                       ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│        public.transactions           │  │      public.allowance_sessions       │
├──────────────────┬───────────────────┤  ├──────────────────┬───────────────────┤
│ id (UUID, PK)    │ gen_random_uuid() │  │ id (UUID, PK)    │ gen_random_uuid() │
│ user_id (UUID,FK)│ app_users(id)     │  │ user_id (UUID,FK)│ app_users(id)     │
│ type (VARCHAR)   │ 'income'|'expense'│  │ name (TEXT)      │ Cycle title       │
│ amount (NUMERIC) │ amount > 0        │  │ description(TEXT)│ Notes / context   │
│ description(TEXT)│ Note / title      │  │ goal_amount(NUM) │ Target savings    │
│ category (TEXT)  │ Preset / custom   │  │ goal_title (TEXT)│ Item / motivation │
│ created_at (TZ)  │ timezone('utc')   │  │ is_active (BOOL) │ Active or archive │
└──────────────────┴───────────────────┘  │ created_at (TZ)  │ timezone('utc')   │
                                          │ closed_at (TZ)   │ When cycle ended  │
                                          └──────────────────┴───────────────────┘
```

---

## 2. Table Specifications

### 2.1 Table: `public.app_users`
Stores user authentication credentials, basic personal identity, and user settings.
* **Primary Key**: `id` (`UUID`)
* **Unique Constraints**: `username` must be unique.
* **Security**: Passwords are saved strictly as salted SHA-256 hashes (`ctrl_savings_pbl_secure_salt_2026`).

| Column Name | Data Type | Nullable | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NO | `gen_random_uuid()` | Unique identifier for each account. |
| `username` | `TEXT` | NO | *None* | Alphanumeric account handle (lowercase). |
| `password` | `TEXT` | NO | *None* | Salted SHA-256 cryptographic hash. |
| `first_name` | `TEXT` | YES | `NULL` | User's first name. |
| `middle_name` | `TEXT` | YES | `NULL` | User's middle name (optional). |
| `last_name` | `TEXT` | YES | `NULL` | User's last name. |
| `date_of_birth` | `DATE` | YES | `NULL` | Birthdate of the user. |
| `total_budget` | `NUMERIC` | NO | `0.00` | Starting budget (defaults to 0.00). |
| `available_budget`| `NUMERIC` | NO | `0.00` | Current balance (defaults to 0.00). |
| `created_at` | `TIMESTAMPTZ`| NO | `timezone('utc', now())`| Account creation timestamp. |

---

### 2.2 Table: `public.transactions`
Stores every money movement (Income / Allowance added, or Spend / Expense deducted).
* **Primary Key**: `id` (`UUID`)
* **Foreign Key**: `user_id` -> `public.app_users(id)` with `ON DELETE CASCADE`.
* **Type Constraint**: `type IN ('income', 'expense')`.
* **Amount Constraint**: `amount > 0`.

| Column Name | Data Type | Nullable | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NO | `gen_random_uuid()` | Unique transaction ID. |
| `user_id` | `UUID` | NO | *None* | Foreign key referencing the owning user. |
| `type` | `VARCHAR(50)` | NO | *None* | Either `'income'` (add money) or `'expense'` (spend). |
| `amount` | `NUMERIC` | NO | *None* | Transaction value in Philippine Pesos (₱). Must be > 0. |
| `description` | `TEXT` | NO | *None* | Short description or note (e.g., 'Jeepney', 'Weekly Allowance'). |
| `category` | `TEXT` | YES | `NULL` | Preset category (Food, Transport, School, Allowance, etc.). |
| `created_at` | `TIMESTAMPTZ`| NO | `timezone('utc', now())`| Exact date and time when the transaction occurred. |

---

### 2.3 Table: `public.allowance_sessions`
Stores allowance tracking cycles, user target savings goals, and period timeframes.
* **Primary Key**: `id` (`UUID`)
* **Foreign Key**: `user_id` -> `public.app_users(id)` with `ON DELETE CASCADE`.
* **State Management**: `is_active` (`BOOLEAN`) identifies the current active cycle. `closed_at` stores when a cycle finished.

| Column Name | Data Type | Nullable | Default Value | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | NO | `gen_random_uuid()` | Unique cycle ID. |
| `user_id` | `UUID` | NO | *None* | Foreign key referencing the owning user. |
| `name` | `TEXT` | NO | *None* | Title of the cycle (e.g., 'Week 2 Baon', 'School Week'). |
| `description` | `TEXT` | YES | `NULL` | Optional context or notes for the period. |
| `goal_amount` | `NUMERIC` | NO | `0.00` | Target savings goal for this cycle. |
| `goal_title` | `TEXT` | YES | `NULL` | Motivation or item name (e.g., 'Save for Sneakers'). |
| `is_active` | `BOOLEAN` | NO | `true` | True if this is the user's ongoing active cycle. |
| `created_at` | `TIMESTAMPTZ`| NO | `timezone('utc', now())`| Timestamp when the cycle was initiated. |
| `closed_at` | `TIMESTAMPTZ`| YES | `NULL` | Timestamp when the cycle was closed/archived. |

---

## 3. Row-Level Security (RLS) Policy

Because **Ctrl+Savings** uses a dedicated backend API layer (`/api/login`, `/api/register`, `/api/user`, `/api/transactions`), the client browser **never** speaks to Supabase directly.

All queries pass through our serverless functions using the `anon` key. Therefore:
1. `transactions` must permit insertion and selection by the serverless API.
2. If RLS is enabled without a policy, PostgreSQL produces error `42501: new row violates row-level security policy for table "transactions"`.
3. To resolve this, we either **disable RLS** on the table (since our backend already validates user identity by session ID), or define an explicit permissive policy `FOR ALL USING (true) WITH CHECK (true)`.

---

## 4. Master SQL Script (Run in Supabase SQL Editor)

Copy and run this entire script once in your **Supabase SQL Editor** to set up or update everything cleanly:

```sql
-- ====================================================================
-- 1. APP USERS: Ensure table and all columns exist with 0.00 defaults
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  total_budget NUMERIC DEFAULT 0.00,
  available_budget NUMERIC DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Ensure all profile columns are present if table already existed
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS total_budget NUMERIC DEFAULT 0.00;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS available_budget NUMERIC DEFAULT 0.00;

-- Reset default starting budget to 0.00
ALTER TABLE public.app_users ALTER COLUMN total_budget SET DEFAULT 0.00;
ALTER TABLE public.app_users ALTER COLUMN available_budget SET DEFAULT 0.00;

-- Update existing accounts to start at 0.00 balance
UPDATE public.app_users SET total_budget = 0.00, available_budget = 0.00 WHERE total_budget = 980.00;

-- ====================================================================
-- 2. TRANSACTIONS: Recreate table with full columns and index
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Index for instant lookup of user's transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- ====================================================================
-- 3. ALLOWANCE SESSIONS: Store cycles and target goals across devices
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.allowance_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  goal_amount NUMERIC DEFAULT 0.00,
  goal_title TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_allowance_sessions_user_id ON public.allowance_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_allowance_sessions_created_at ON public.allowance_sessions(created_at DESC);

-- ====================================================================
-- 4. ROW-LEVEL SECURITY: Allow Backend API Access
-- ====================================================================
-- Disable RLS so serverless backend API can insert, select, update, and delete freely
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowance_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. REFRESH SCHEMA CACHE
-- ====================================================================
NOTIFY pgrst, 'reload schema';
```

---

## 5. How Money Calculation Works in the App

* **Initial State**: Every user begins with **₱0.00** balance.
* **Adding Money (Income)**: User inputs an amount (e.g. ₱500) and category (e.g. Allowance). The API records `{ type: 'income', amount: 500 }`. The wallet balance increases to **+₱500.00**.
* **Spending Money (Expense)**: User inputs an amount (e.g. ₱75) and category (e.g. Food). The API records `{ type: 'expense', amount: 75 }`. The wallet balance decreases to **₱425.00** (`500 - 75`).
* **Formula**:
  $$\text{Available Cash} = \sum (\text{Income Amounts}) - \sum (\text{Expense Amounts})$$
