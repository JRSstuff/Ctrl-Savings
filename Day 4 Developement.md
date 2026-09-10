# Day 4 Development Log: Ctrl+Savings

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
**Date**: September 10, 2026  

---

## Executive Summary

During Day 4 of development, **Ctrl+Savings** underwent a major stabilization, user interface restoration, and AI copilot optimization. Codebase changes introduced during group collaboration had inadvertently reverted parts of the application to static mock data, injected browser `window.prompt()` popups, caused 500-level API crashes on cycle creation, and created subtle timestamp filtering bugs that hid newly saved transactions.

Day 4 completely resolved these regressions:
1. **Authentic UI Modal Restoration**: Replaced all native browser JavaScript popups (`prompt()`) with high-contrast, theme-aware modals adhering strictly to the design guidelines.
2. **Live Database Synchronization**: Restored dynamic data binding with Supabase PostgreSQL, completely replacing hardcoded balances and fake 2023 grocery transactions with live, reactive calculations.
3. **Dashboard Decluttering**: Removed confusing inner gauge toggle pills, static demo bar charts, and redundant safety limit configuration cards from modals.
4. **Cycle API Resilience**: Fixed server crashes on `POST /api/sessions` caused by nested object payload serialization.
5. **High-Speed AI Advisor Optimization (`gemini-3.6-flash`)**: Eliminated 50-second timeouts by upgrading to Google's blazing-fast `gemini-3.6-flash` (1.4s response latency) with native JSON formatting.
6. **Anti-Duplication AI Engine**: Solved the single-event transaction duplication bug where conversational sentences like *"i ate burger i spent 200 pesos"* created double entries totaling ₱400.
7. **Cycle Boundary & Transaction Visibility Fix**: Diagnosed and resolved the root cause of transactions disappearing from the dashboard due to orphaned `closed_at` timestamps on active allowance cycles.
8. **Team Credits & Port Alignment**: Embedded the full 5-member project development team across the UI and documentation, aligning all dev and preview instructions to `http://localhost:4173/`.

---

## Section 1: UI Integrity & Elimination of JavaScript Popups

### 1.1 Eradication of Browser `window.prompt()` Dialogs
* **Symptom**: Clicking "Edit Weekly Budget" or the "Safety Spend Guard" triggered intrusive, unstyled native browser JavaScript popups (`window.prompt()`), violating the high-contrast UI design rules and breaking mobile touch ergonomics.
* **Root Cause**: Collaborator changes implemented quick temporary inputs via native browser `prompt()` rather than building dedicated Svelte modal components.
* **Solution**:
  - Built the **Edit Budget Modal** (`isEditBudgetModalOpen`):
    - Dark backdrop overlay with subtle blur (`bg-black/60 backdrop-blur-xs`).
    - Dual action mode toggle: **Target Limit** (updates cycle goal via `PUT /api/sessions`) vs. **+ Add Allowance** (logs an allowance income transaction via `POST /api/transactions`).
    - Quick preset amount chips (`₱200`, `₱300`, `₱500`, `₱1,000`, `₱2,000`).
    - Terse, clear buttons: `Cancel` and `Save`.
  - Built the **Safety Limit Modal** (`isSafetyLimitModalOpen`):
    - Dedicated modal for managing single-purchase spend alert thresholds.
    - Quick preset chips: `Off (₱0)`, `₱50`, `₱100`, `₱150`, `₱300`, `₱500`.
    - Eliminated 100% of native browser prompt calls from the codebase.

### 1.2 TopBar & Authentication Leak on Login Screen
* **Symptom**: When signed out on the login screen (`AuthView`), the `<TopBar>` and floating application logo remained visible in the background, displaying an active `<button>Current Cycle</button>` above the login card.
* **Root Cause**: The layout shell rendered `<TopBar>` unconditionally without verifying whether an active user session existed.
* **Solution**:
  - Enclosed `<TopBar>` and the floating logo inside `{#if appLoaded && session}`.
  - The login view is now completely clean, focused, and distraction-free, with its own dedicated header and logo.

### 1.3 Dashboard Clutter & Fake Demo Elements
* **Symptom**:
  1. The circular SVG gauge contained an obstructive inner badge button (`🗓️ Monthly Balance`) that clashed with the primary balance text.
  2. The home screen displayed a static, fake "Month-to-Month" bar chart showing hardcoded DEC–MAY data.
  3. The "Add Transaction" modal contained a redundant, persistent configuration box to change safety limits while logging an expense.
* **Root Cause**: Experimental and placeholder components were left enabled, cluttering the primary student dashboard flow.
* **Solution**:
  - Removed the inner toggle button from [`Gauge.svelte`](file:///c:/Users/BeboyPC/Documents/AllowanceTracker/src/lib/components/Gauge.svelte); the circular gauge now showcases a crisp, bold balance readout (`₱X.XX`) and subtitle (`available out of ₱Y.YY`).
  - Removed `SpendingChart.svelte` and its card from `App.svelte`.
  - Removed the persistent safety configuration card from `AddModal.svelte`, leaving only the compact over-limit alert when an expense actually exceeds the threshold.

---

## Section 2: Real Database Re-connection & Dynamic Money Counters

### 2.1 Reconnection to Supabase PostgreSQL Scoped to User UUID
* **Symptom**: The main dashboard displayed hardcoded static numbers (`₱980.00` total, `₱215.60` available) and 3 fake 2023 Safeway transactions. Modifying transactions had no effect on the database.
* **Root Cause**: The active session state was reading `ctrl_savings_user` (username string) instead of `allowance_user_id` (the authenticated user UUID required for Supabase foreign key scoping). API calls failed silently or bypassed the database.
* **Solution**:
  - Re-bound `session` to `localStorage.getItem('allowance_user_id')`.
  - Restored dynamic fetching in `App.svelte`:
    - `fetchUserProfile()` → queries `app_users` table via `GET /api/user`.
    - `fetchSessions()` → queries `allowance_sessions` table via `GET /api/sessions`.
    - `fetchTransactions()` → queries `transactions` table via `GET /api/transactions`.
  - Authentically calculated all money counters from real database records:
    - **Total Income**: `sum(income)`
    - **Total Expense / Spent**: `sum(expense)`
    - **Available Budget**: `Math.max(0, totalIncome - totalExpense)`
    - **Total Budget Limit**: `totalIncome > 0 ? totalIncome : (cycleGoal > 0 ? cycleGoal : availableBudget)`
    - **Gauge & Progress Bar**: 100% reactive to real database entries.

### 2.2 Cycle Creation Server Error (`POST /api/sessions` 500)
* **Symptom**: Creating a new allowance cycle threw `500 Server error creating cycle`.
* **Root Cause**: `SessionModal.svelte` passed an options object `{ name, description, goalAmount, goalTitle }` to `onStartNewSession()`, but `App.svelte` treated the arguments as positional, resulting in a nested object payload: `{"name":{"name":"Weekly Baon",...}}`. On the server, calling `.trim()` on an object threw an unhandled `TypeError`.
* **Solution**:
  - Updated `App.svelte` `handleStartNewSession()` and `handleEditSession()` to seamlessly handle either single options objects or positional parameters.
  - Updated serverless route handlers (`vite.config.js` and `api/sessions.js`) with defensive unnesting that supports both camelCase (`goalAmount`) and snake_case (`goal_amount`).

---

## Section 3: AI Advisor ("Ctrl+Advisor") Speed & Deduplication

### 3.1 Model Latency & Deprecation Upgrade (`gemini-3.6-flash`)
* **Symptom**: Asking the AI Advisor a question took 50+ seconds or failed with 404/500 errors.
* **Root Cause**: The backend called deprecated endpoints (`gemini-2.5-flash`), causing failed network round-trips and fallback delays.
* **Solution**:
  - Benchmarked available models against the Google Gemini API:
    - `gemini-3.5-flash-lite`: 53,243ms
    - `gemini-3.6-flash`: **1,476ms** (verified blazing fast)
  - Configured **`gemini-3.6-flash`** as primary model with native `application/json` formatting, backed by fallbacks to `gemini-3.7-flash` and `gemini-flash-latest`.

### 3.2 Single-Purchase Transaction Duplication Bug
* **Symptom**: When a user typed *"i ate burger i spent 200 pesos"*, the AI recorded two ₱200 burger expenses totaling ₱400.
* **Root Cause**: Natural language processing split *"ate burger"* and *"spent 200 pesos"* into two separate transaction actions.
* **Solution**:
  - **Prompt Engineering**: Added explicit deduplication rules stating that mentioning an item and its price in the same sentence constitutes **one single transaction**.
  - **Server-Side Deduplication Filter**: Added a `seenCounts` map in `api/chat.js` and `vite.config.js` that discards duplicate tuples (same type, amount, and item name) unless explicit quantity words (*"2"*, *"two"*, *"both"*, *"pair"*, etc.) appear in the message.
  - **Client-Side Safeguard**: Added an extra filter in `ChatbotView.svelte` before dispatching transactions to Supabase.

---

## Section 4: Cycle Boundary Filtering & Transaction Visibility Bug

### 4.1 Missing Recorded Transactions on Dashboard
* **Symptom**: The AI Advisor responded *"Recorded your ₱15 Jeepney Fare under Weekly Baon ✓ SAVED"*, and the database confirmed the transaction was inserted. However, the home dashboard still showed only 2 transactions, with spent money stuck at ₱100.00 instead of ₱115.00.
* **Root Cause**: 
  - The user's active cycle ("Weekly Baon") had `is_active: false` and a `closed_at: 2026-09-10T14:01:15` timestamp in the database (left behind when a temporary cycle was created and deleted).
  - In `App.svelte` and `SessionModal.svelte`, `sessionTransactions` filtered records using:
    ```javascript
    const end = selectedSession.closed_at ? new Date(selectedSession.closed_at).getTime() : Infinity;
    return transactions.filter(t => t.time >= start && t.time <= end);
    ```
  - Because the Jeepney Fare was recorded at `14:13:42` (after `14:01:15`), the derived filter dropped the new transaction from view.
* **Solution**:
  - **Unbounded Active & Latest Cycles**: Updated both `sessionTransactions` and `getSessionStats` so that active cycles, currently viewed cycles, or the latest cycle in the account never use a closed timestamp cutoff (`end = Infinity`). Only truly archived older cycles use finite cutoffs.
  - **Self-Healing Session Activation**: Added `handleActivateSession()` in `App.svelte`. If all cycles in the database ever become inactive (e.g. after cycle deletion), the app automatically reactivates the newest cycle in Supabase (`is_active: true`, `closed_at: null`).
  - **Database Repair**: Updated the user's `Weekly Baon` row in Supabase to `is_active: true`, `closed_at: null`.

---

## Section 5: Team Credits & Documentation Alignment

### 5.1 Project Development Team Credits
* **Requirement**: Prominently feature the 5 project members and their assigned academic roles across the application.
* **Implementation**:
  - **Settings & Credits Tab ([`App.svelte`](file:///c:/Users/BeboyPC/Documents/AllowanceTracker/src/App.svelte))**: Added a dedicated high-contrast **Project Team & Contributors** card displaying custom icons, role badges, full names, and handle tags:
    1. **Problem & Design Analyst**: `@Shawn Hitalada`
    2. **Main Programmer**: `@Justine Salvador`
    3. **Tester & Debugger**: `@John Kurt Montero`
    4. **Operator & Presenter**: `@Mark Bacus`
    5. **Project Leader**: `@Danlord Farell A. Soriano`
  - **Profile Credits Modal ([`ProfileView.svelte`](file:///c:/Users/BeboyPC/Documents/AllowanceTracker/src/lib/components/ProfileView.svelte))**: Updated the "About this App" modal to list the entire project team.
  - **Repository Documentation ([`README.md`](file:///c:/Users/BeboyPC/Documents/AllowanceTracker/README.md))**: Added the complete roster under **Academic Credit & Project Development Team**.

### 5.2 Port Alignment to `http://localhost:4173/`
* **Symptom**: `README.md` referenced `http://localhost:5173`, but local development and preview scripts run on port `4173`.
* **Solution**: Updated all development and preview instructions in `README.md` to reference `http://localhost:4173/`, matching `vite.config.js`, `run.bat`, and `test-offline.bat`.

---

## Verification & Validation Summary

| Test Case | Scenario / Query | Expected Behavior | Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Modal Integrity** | Click "Edit Weekly Budget" | Open authentic UI modal with preset chips (no `window.prompt`) | Clean high-contrast modal rendered | **PASS** |
| **Auth View Cleanliness** | Visit app while logged out | Render clean login card with zero top bars or cycle buttons | No top bar or logo leak | **PASS** |
| **Database Sync** | Load home dashboard | Fetch real user records from Supabase; calculate live totals | Accurate income, expense, and balance | **PASS** |
| **AI Single Purchase** | *"i ate burger i spent 200 pesos"* | Exactly 1 expense of ₱200 (Burger, Food) recorded | 1 transaction created (0 duplicates) | **PASS** |
| **AI Compound Purchase** | *"my papa gave me 200 but i spent 50"* | 1 income of ₱200, 1 expense of ₱50 recorded | 2 distinct transactions logged | **PASS** |
| **AI Model Latency** | Send message to AI Advisor | Fast response via `gemini-3.6-flash` | Responded in 1.4s | **PASS** |
| **Transaction Visibility** | Log ₱15 Jeepney Fare in chat | Transaction appears on home dashboard immediately | Visible in list; balance updated to ₱1,385.00 | **PASS** |
| **Team Credits** | Open Settings & Credits tab | Display all 5 team members with roles and handles | Formatted beautifully in UI and README | **PASS** |
| **Build & Compilation** | `npm run build` | 0 errors, 0 warnings, clean production bundle | Built in 470ms | **PASS** |

---

## Conclusion

With Day 4 complete, **Ctrl+Savings** is fully debugged, robust, and aligned with academic requirements for CS111. All mock data has been eradicated, the AI Advisor operates with sub-2-second response latency and zero duplication bugs, allowance cycles persist seamlessly in Supabase without hidden transaction cutoffs, and the full team is credited across the application.
