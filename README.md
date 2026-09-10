# Ctrl+Savings • Student Allowance Tracker

An offline-first, zero-lag allowance and savings tracker tailored for college and high school students. Designed with a clean, high-contrast user interface and intuitive budget guards to keep students in full control of their daily baon.

---

## 🎓 Academic Credit & Project Development Team

* **Course & Milestone:** **CS111 - Introduction to Computing** (Prelims Project-Based Learning)
* **Institution:** University of Science and Technology of Southern Philippines (**USTP CDO**)

### 👥 Team Members & Roles
1. **Problem & Design Analyst** - `@Shawn Hitalada`
2. **Main Programmer** - `@Justine Salvador`
3. **Tester & Debugger** - `@John Kurt Montero`
4. **Operator & Presenter** - `@Mark Bacus`
5. **Project Leader** - `@Danlord Farell A. Soriano`

---

## ⚡ Core Features

1. **Simple, Neat Allowance Loading Screen**
   * Calm, student-friendly startup sequence with an animated pulsing wallet SVG icon, live daily/weekly baon readout, and milestone allowance verification phases. No logos or distracting sci-fi elements.

2. **Weekly vs. Monthly Balance Specification**
   * Instant toggle between **Weekly** (ideal for Monday–Friday school baon or 7-day week) and **Monthly** (for dorm rent and monthly stipends).
   * Dynamically calculates your **Daily Baon Pace**:
     * Weekly: `₱X/day (7-day week)` and `₱Y/day (5-day school week)`.
     * Monthly: `₱X/day (30-day month)` and `₱Y/week (4-week month)`.

3. **Safety Spend Guard**
   * Configurable daily per-transaction spend limit (default ₱250).
   * Whenever an expense exceeds this threshold, the app triggers an amber confirmation alert requiring explicit confirmation before recording.

4. **Circular Allowance Gauge**
   * High-contrast SVG progress ring providing an instant visual snapshot of remaining cash out of total cycle budget.

5. **Visual Appearance (Dark & Light Mode)**
   * Complete dark mode and light mode palettes, persisted across visits in `localStorage`.
   * Accessible in the dedicated **Settings & Credits** tab and Profile tab.

6. **Clean Vector Icons for Transactions**
   * Professional SVG icons for `+ Allowance` and `- Expense` transaction types.

7. **AI Financial Advisor (Ctrl+Advisor)**
   * Powered by Google Gemini. Provides contextual advice tailored to whether your allowance is weekly or monthly, with hacks on canteen meal planning and fare optimization.

8. **PWA Offline-First Support**
   * Fully installable on iOS, Android, and Desktop via Vite PWA with offline caching.

---

## 🚀 How to Run and Test the Project
 
### Local Development Server
Run the full Vite + Svelte 5 application:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ctrl-savings.git
   cd ctrl-savings
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   *(Or double-click `run.bat` on Windows)*

4. Open [http://localhost:4173/](http://localhost:4173/) in your browser.

---

### Production Build & Offline PWA Preview
```bash
npm run build
npm run preview
```
*(Or double-click `test-offline.bat` on Windows)*

Open [http://localhost:4173/](http://localhost:4173/) in your browser.

---

## 🛠️ Tech Stack

* **Frontend:** Svelte 5 + Vite
* **Styling:** Tailwind CSS v4
* **PWA:** vite-plugin-pwa (Workbox caching)
* **Backend:** Vercel Serverless Functions (`api/`)
* **Database:** Supabase PostgreSQL
* **AI:** Google Gemini
* **Hosting:** Vercel Ready (`vercel.json` included)

---

## 📄 License
Created for academic demonstration at USTP CDO (CS111). All rights reserved.
