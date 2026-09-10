# Day 2 Development Log: Ctrl+Savings

**Project**: Ctrl+Savings (Zero-Lag, Offline-First Allowance & Savings Tracker)  
**Student Developer**: Justine Roy P. Salvador  
**Project Development Team**:
* **Problem & Design Analyst**: @Shawn Hitalada
* **Main Programmer**: @Justine Salvador
* **Tester & Debugger**: @John Kurt Montero
* **Operator & Presenter**: @Mark Bacus
* **Project Leader**: @Danlord Farell A. Soriano  
**Degree Program**: Bachelor of Science in Computer Science  
**Institution**: University of Science and Technology of Southern Philippines (USTP CDO)  
**Course & Milestone**: CS111 - Introduction to Computing (Prelims Project-Based Learning)  
**Date**: September 7, 2026  

---

## Executive Summary

Building upon the core authentication and PWA foundation established in Day 1, Day 2 transformed **Ctrl+Savings** into a comprehensive, intelligent financial management application. 

Key milestones achieved on Day 2 include:
1. **Interactive Financial Operations**: Equalized transaction modals, dynamic over-budget warnings with pre-purchase balance previews, quick preset toggles, relative time formatting, and theme state persistence.
2. **Allowance Cycles & Sessions Engine**: Full multi-cycle allowance periods persisted to Supabase PostgreSQL (`allowance_sessions` table) with customizable savings goals and target tracking.
3. **Zero-Gatekeeping Error Architecture**: Real-time error transparency across all network and database layers, eradicating hidden console errors and fixing UUID syntax mismatches.
4. **AI Financial Assistant ("Ctrl+Advisor")**: Powered by Google Gemini 3.6 Flash, featuring multi-transaction natural language parsing (e.g. compound income and expense handling in a single phrase), deterministic token-saver fast paths, and interactive over-budget confirmation prompts.

---

## Section 1: Financial UI/UX Refinements & Transaction Experience

### 1.1 Action Button Sizing & Modal Balance Inspection
* **Symptom**: The "Spend Money" button had inconsistent dimensions compared to the "Add Money" button, and users could not see their available funds while logging an expense.
* **Root Cause**: Unequal padding classes in the action selector modal and lack of current wallet balance context in the expense form.
* **Solution**:
  - Equalized dimensions and tap-target sizes across both action buttons.
  - Added a live balance indicator inside the Spend form showing **Current Balance**, **Amount to Spend**, and the calculated **Remaining Balance** after spending.
  - Implemented dynamic budget warning alerts that turn amber/red when an entered expense exceeds available funds.

### 1.2 Quick Category Preset Deselection & Input Flexibility
* **Symptom**: Clicking a category preset (e.g. 🍔 Food, 🚌 Transport) locked the selection permanently; users could not deselect the preset to write a custom description or pick an alternative emoji.
* **Root Cause**: The active preset handler set state unilaterally without an toggle/deselect condition.
* **Solution**:
  - Implemented an idempotent toggle mechanism: clicking an active preset deselects it.
  - When a preset is selected, the input locks to that clean category name.
  - When deselected, custom note fields and emoji drawer pickers immediately re-enable.

### 1.3 Relative Timestamps & Date Formatting
* **Symptom**: Transaction entries lacked time-of-day information and readable time-elapsed context.
* **Root Cause**: The UI rendered only raw date strings (`YYYY-MM-DD`) without hours, minutes, or relative calculations.
* **Solution**:
  - Built an intuitive relative time formatter (`just now`, `5m ago`, `2h ago`, `3d ago`).
  - Added full formatted date and 12-hour clock timestamps (`MM/DD/YYYY • hh:mm A`) for historical auditing.

### 1.4 Theme Persistence Across Page Refreshes
* **Symptom**: Switching to Dark Mode reset back to Light Mode whenever the user refreshed the browser.
* **Root Cause**: The theme state was stored purely in memory and was not rehydrated from browser storage upon application initialization.
* **Solution**:
  - Added bidirectional synchronization with `localStorage.getItem('allowance_theme')` and `localStorage.setItem('allowance_theme', theme)`.
  - The app now instantly remembers user preference on re-entry.

### 1.5 Gamified Balance Presentation
* **Symptom**: The primary dashboard displayed a plain, clinical "Balance: ₱..." label.
* **Root Cause**: Standard accounting terminology lacking student encouragement and dopamine reinforcement.
* **Solution**:
  - Replaced the generic "Balance" header with a satisfying, gamified **"Saved Up ₱[amount]"** display.
  - Minimalized top bar cycle navigation down to a clean, direct-to-the-point `📁 Cycle` button.

---

## Section 2: Database-Backed Allowance Cycles & Sessions

### 2.1 Multi-Period Cycle Tracking Architecture
* **Requirement**: Enable students to manage distinct allowance periods (e.g. *Prelim Week*, *Monthly Allowance*, *Midterm Baon*) with independent balances and goals, fully saved to the database.
* **Database Design (`allowance_sessions` table)**:
  ```sql
  CREATE TABLE public.allowance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    goal_amount NUMERIC(10,2) DEFAULT 0,
    goal_title TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ
  );
  ```
* **Serverless Endpoints (`/api/sessions`)**:
  - `GET /api/sessions`: Fetches all user cycles, identifying active and archived periods.
  - `POST /api/sessions`: Creates a new cycle and automatically archives previous active cycles.
  - `PUT /api/sessions`: Updates cycle names, descriptions, and savings targets.
  - `DELETE /api/sessions?id=[uuid]`: Deletes a cycle with cascading referential integrity.

---

## Section 3: The "Zero-Gatekeeping" Error System & Endpoint Fixes

### 3.1 Architectural Principle: No Error Gatekeeping
* **Mandate**: Every failure across network, database, or validation must be surfaced directly to the user in the UI—never hidden, suppressed, or buried in developer console logs.
* **Implementation**:
  - Created a global high-priority floating alert banner (`fixed top-4 z-[9999]`) rendered on top of all modals and tabs.
  - Displays un-truncated HTTP error codes and exact PostgreSQL error messages (`break-all font-mono text-xs select-text`).
  - Added an interactive "Retry Sync" action and dismiss button (`✕`).

### 3.2 Fixed `DELETE /api/transactions` (HTTP 404 Not Found)
* **Symptom**: Deleting a transaction resulted in `404 Not Found` in network logs.
* **Root Cause**: The preview middleware in `vite.config.js` tested `req.url === '/api/transactions'` (exact string equality). When the query parameter was appended (`?id=d4d48d6b-...`), the equality failed and fell through to Vite's static file handler.
* **Solution**: Updated route matching to `req.url === '/api/transactions' || req.url.startsWith('/api/transactions?')`. Added regex validation to ensure UUID parameters are validated before querying PostgreSQL.

### 3.3 Fixed UUID Syntax Error (`22P02: invalid input syntax for type uuid: "sess_..."`)
* **Symptom**: Deleting or loading cycles threw PostgreSQL database error `22P02: invalid input syntax for type uuid: "sess_1788764363241"`.
* **Root Cause**: Legacy mock sessions previously generated string IDs prefixed with `sess_`. PostgreSQL `UUID` columns reject non-RFC-4122 string formats.
* **Solution**:
  - Transitioned all client-side ID generation strictly to RFC 4122 v4 UUIDs via `crypto.randomUUID()`.
  - Added an automated local migration on startup that sanitizes and replaces legacy `sess_` IDs in `localStorage`.
  - Configured serverless handlers to cleanly intercept legacy non-UUID IDs without failing PostgreSQL queries.

---

## Section 4: Gemini AI Assistant ("Ctrl+Advisor") Integration

### 4.1 Architecture & API Key Connection
* **Provider**: Google Gemini API via `https://generativelanguage.googleapis.com/v1beta/models/`.
* **Configured Key**: Stored securely in `GEMINI_API_KEY` server environment variable (never exposed in repository or client bundles).
* **Endpoint Implementation**: Created `POST /api/chat` in both `api/chat.js` (production serverless) and `vite.config.js` (local preview middleware).
* **Live User Context**: Each prompt injects the user's name, active cycle name, available cash balance, active savings goals, and recent 8 transactions.

### 4.2 Model Selection & High Demand 503 Resolution
* **Symptom**: Queries to `gemini-flash-latest` intermittently failed with `HTTP 503: This model is currently experiencing high demand. Spikes in demand are usually temporary`.
* **Root Cause**: Google's API returned deprecation notices on older flash endpoints and explicitly advised: `Please update your code to use models/gemini-3.6-flash for the latest features and improvements`.
* **Solution**:
  - Upgraded primary model to **`gemini-3.6-flash`**, achieving **~2.4-second response times** with 0 errors.
  - Implemented automatic cascading fallback: `gemini-3.6-flash` $\rightarrow$ `gemini-3.5-flash` $\rightarrow$ `gemini-flash-latest`.

### 4.3 Deterministic Token-Saver Fast Paths
To optimize token quotas and minimize latency, deterministic balance checks bypass the LLM entirely:
- *"balance"*, *"what is my balance"*, *"how much money do I have"* $\rightarrow$ Immediate database balance calculation returned in `0ms` LLM cost.
- *"recent expenses"*, *"my expenses"* $\rightarrow$ Direct recent transaction history readout.

### 4.4 Multi-Transaction Compound Parsing
* **Symptom**: When a user typed *"my papa gave me 200 pesos but i spent 50 pesos"*, the previous model only parsed a single transaction.
* **Solution**:
  - Updated Gemini system prompt and schema to output an array of `transactions: [...]`.
  - In `"my papa gave me 200 pesos but i spent 50 pesos"`, the AI simultaneously records:
    1. **Income**: `+₱200.00` ("Allowance from Papa", category: `Allowance`)
    2. **Expense**: `-₱50.00` ("Personal Expense", category: `Other`)
  - Frontend sequentially saves each transaction to the Supabase database and renders individual receipt cards.

### 4.5 Interactive Over-Budget Protection
* **Requirement**: Prevent accidental or impulsive overspending. If an expense exceeds available funds, do NOT log it silently.
* **Workflow**:
  1. AI compares expense against available balance.
  2. If `amount > availableBalance`, flags `exceedsBudget: true`.
  3. Halts automatic database insertion.
  4. Renders an interactive **Budget Warning Card** inside the chat bubble:
     - Details item description, expense amount, and the exact shortfall (`₱[overAmount]`).
     - Displays prompt: *"You do not have enough money. Are you sure you want to continue?"*
     - **`[✓ Yes, Record Expense]`**: Overrides budget limit, saves transaction to database, updates wallet balance.
     - **`[✕ Cancel]`**: Cancels the pending transaction cleanly with zero balance impact.

### 4.6 PWA Workbox Cache Invalidation for Development
* **Symptom**: Updates made to frontend components appeared delayed in the browser due to Service Worker precaching.
* **Solution**:
  - Set `devOptions: { enabled: false }` in `VitePWA` inside `vite.config.js`.
  - Added an automatic Service Worker cache cleanup routine in `App.svelte` for `localhost` connections to ensure instant updates on reload.

---

## Section 5: Current Three-Tier System Architecture

```
                                  +---------------------------------------+
                                  |            Client Browser             |
                                  |    (Svelte 5 SPA + PWA Service        |
                                  |   Worker + Real-Time Reactive UI)     |
                                  +-------------------+-------------------+
                                                      |
                                       HTTP / JSON via Relative URLs
                                   (e.g., POST /api/chat, /api/sessions)
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |         Vercel Serverless API         |
                                  |     • api/chat.js (Gemini 3.6 Flash)  |
                                  |     • api/sessions.js (Cycle CRUD)    |
                                  |     • api/transactions.js (Tx CRUD)   |
                                  |     • api/login.js / api/register.js  |
                                  +---------+-------------------+---------+
                                            |                   |
                       Gemini Generative    |                   |  Private Supabase
                       Language REST API    |                   |  PostgreSQL Client
                                            v                   v
                        +----------------------+    +----------------------+
                        |   Google Gemini AI   |    |  Supabase Database   |
                        |   (gemini-3.6-flash) |    |  • public.app_users  |
                        |  • Multi-Tx Parsing  |    |  • public.sessions   |
                        |  • Budget Analysis   |    |  • public.txs        |
                        +----------------------+    +----------------------+
```

---

## Section 6: Verification & Validation Summary

| Test Case | Scenario / Query | Expected Behavior | Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Production Build** | `npm run build` | 0 errors, 0 warnings, optimized bundle | Built in ~448ms with 0 errors | **PASS** |
| **Token-Saver Fast Path** | Chat: *"balance"* | Immediate balance readout without LLM latency or tokens | Returned live database calculation in 0ms LLM time | **PASS** |
| **Single Expense Logging** | Chat: *"I bought a coffee for 100 pesos"* | Auto-logged to DB, green receipt displayed in chat | Persisted to Supabase; balance deducted | **PASS** |
| **Over-Budget Warning** | Chat: *"I bought a luxury laptop for 85000 pesos"* | Warning card rendered with Yes/Cancel actions | Prevented unconfirmed database write | **PASS** |
| **Compound Multi-Action** | Chat: *"my papa gave me 200 pesos but i spent 50 pesos"* | Batch logs `+₱200` Income and `-₱50` Expense | Both transactions parsed and recorded | **PASS** |
| **Delete Transaction** | `DELETE /api/transactions?id=[uuid]` | Removed from DB, UI updates immediately | Record deleted from Supabase without 404s | **PASS** |
| **Allowance Cycle CRUD** | Create, switch, and delete cycles | Persisted in `allowance_sessions` table with goal tracking | Full lifecycle persistence with cascading integrity | **PASS** |
| **UUID Compatibility** | Sanitizes legacy `sess_` strings | Safe RFC 4122 v4 UUID handling | Zero PostgreSQL 22P02 syntax errors | **PASS** |
| **Zero Gatekeeping** | Simulated network/database error | Immediate prominent red alert banner with error code | Surfaced full error to UI without swallowing | **PASS** |

---

## Conclusion

At the conclusion of Day 2, **Ctrl+Savings** stands as a feature-complete, production-grade allowance and financial guidance system. By combining rapid Svelte 5 frontend reactivity, resilient PostgreSQL storage, zero-error suppression transparency, and Google Gemini 3.6 Flash intelligence, the application fulfills all requirements of the CS111 project-based learning curriculum.
