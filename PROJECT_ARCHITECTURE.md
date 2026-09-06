# Ctrl+Savings - Project Architecture & Specification

## 1. Core Vision & Goal
- **Project Name**: Ctrl+Savings
- **Goal**: A zero-lag, offline-first allowance tracker and savings management application.
- **User Experience**: Instant UI responsiveness with optimistic local-first updates, dynamic responsive boxes, and transparent background synchronization.
- **Design Aesthetic**: High-contrast, human-crafted minimalism. Green + Black (Dark theme) or Green + White (Light theme). Crisp lines, razor-sharp contrast, functional clarity.

---

## 2. Primary Technology Stack
- **Frontend**: [Svelte](https://svelte.dev/) (Svelte 5)
- **Bundler & Tooling**: [Vite](https://vite.dev/) (Vite 8)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4 with `@tailwindcss/vite`)
- **PWA & Offline Caching**: `vite-plugin-pwa` (Workbox Service Worker, auto-updating cache)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Row-Level Security)
- **Serverless & Hosting**: [Vercel](https://vercel.com/) (Vercel Serverless Functions in `/api/`, SPA rewrites)

---

## 3. Core Architectural Rules

### Rule 1: Cross-Platform Strategy & Mobile-First Responsive Layout
- The codebase **must** remain 100% compatible with:
  1. Mobile Phone Web Browsers & PWA Installation (Primary Target - Android & iOS)
  2. Desktop & Tablet Web Deployment (Vercel)
  3. Future Mobile Wrapping via **Capacitor** (iOS / Android)
  4. Future Desktop Wrapping via **Tauri**
- **Mobile-First Responsive Layout & Fluid Shrink Rule**:
  - Built primarily for phones with touch-friendly controls (min 44px tap targets) and mobile viewport safe-area handling (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
  - **Fluid Box Sizing**: All boxes, cards, and flex children must include `min-w-0` and fluid sizing so boxes shrink smoothly down to narrow 320px phone viewports without horizontal overflow, wrapping glitches, or fixed-width breaks.
  - Dynamic "invisible boxes" (fluid flex / grid cards) that reflow seamlessly between mobile single-column layouts and tablet/desktop multi-column grids.
- **Strict Constraint**: Never introduce native-only packages, browser-incompatible APIs, or platform-locking dependencies that break the standard web build. Always wrap platform-specific APIs behind abstract service interfaces.

### Rule 2: Offline-First Architecture
- **UI & Assets**: All application shell assets (HTML, CSS, JS, static icons, `LOGO.png`) must be cached locally via Service Worker (`vite-plugin-pwa`). The app must load and operate immediately even with zero connectivity.
- **Data Persistence & Synchronization**:
  - All read and write transactions occur against a local store (e.g., IndexedDB / Dexie.js or local cache).
  - Write operations are queued locally when offline or in transit.
  - An automatic sync engine processes queued mutations against Supabase when network connectivity is confirmed, resolving conflicts deterministically.

### Rule 3: No Standalone Backend Servers
- **No standalone Express, Fastify, Flask, Django, or custom persistent server runtimes**.
- All backend operations must strictly use:
  1. Direct Supabase client calls (`@supabase/supabase-js`) utilizing Row Level Security (RLS) policies.
  2. Vercel Serverless Functions (`/api/*`) for server-side logic, secret-key actions, or external webhooks.

### Rule 4: Anti-AI Aesthetic, Crisp Geometry & 1-Word Copywriting
- **No AI Tropes**: Strictly forbid decorative rainbow/multi-stop text gradients, ambient background blur blobs, and indiscriminate over-rounding (`rounded-3xl` / bubbly pills everywhere).
- **Crisp Geometry**: Structure interfaces with clean boxes, sharp lines, and subtle radii (`rounded-md` or `rounded-sm` or square). Elements must feel purposeful, structural, and engineered.
- **Strict 1-Word / Terse Copywriting**: Labels and headers must be direct, punchy, and strictly 1 word (or at most 2 words when unavoidable), e.g., `STATUS`, `DEVICE`, `CACHE`, `API`, `ONLINE`, `OFFLINE`, `READY`. Eliminate promotional AI filler text.
- **Interaction-Only Feedback**: Glows, pulse borders, or accent highlights are prohibited on static elements. They are reserved exclusively as active feedback for user actions (button clicks, form submits, network state shifts).

### Rule 5: Strict High-Contrast Color System (No Blending Text)
- **High-Contrast Guarantee**: Text must NEVER blend into its background. Light text on light backgrounds or dark text on dark backgrounds is strictly forbidden. All states (idle, hover, active, error, success) must maintain high contrast (WCAG AA/AAA compliant).
- **Dark Theme (Green + Black)**:
  - Base: Deep black `#09090b` / `#000000`.
  - Cards: High-contrast charcoal `#121215` with crisp `#27272a` borders.
  - Primary text: Crisp white `#ffffff`. Secondary text: High-contrast light gray `#a1a1aa`.
  - Success badge / text: Bright vibrant emerald `#22c55e` / `#4ade80` on deep dark green `#052014` with `#14532d` border.
  - Error badge / text: Bright high-contrast red `#f87171` on deep dark red `#2a0c0c` with `#7f1d1d` border.
- **Light Theme (Green + White)**:
  - Base: Crisp pure white `#ffffff` / `#f8fafc`.
  - Cards: Pure white `#ffffff` with crisp `#e2e8f0` borders.
  - Primary text: Deep black `#09090b`. Secondary text: Dark slate `#475569`.
  - Success badge / text: Deep dark emerald `#065f46` (dark forest green, high contrast on light) on pale mint `#ecfdf5` with `#059669` border.
  - Error badge / text: Deep dark crimson `#991b1b` (dark blood red, high contrast on light) on pale rose `#fef2f2` with `#b91c1c` border. NEVER use light pink or light red text on white/light backgrounds!

---

## 4. Directory Structure Conventions
```text
AllowanceTracker/
├── api/                     # Vercel Serverless Functions (e.g., api/health.js)
├── public/                  # Static assets and PWA icons
│   ├── LOGO.png             # Official brand logo
│   └── favicon.svg
├── src/
│   ├── assets/              # Bundled assets (logo.png, etc.)
│   ├── lib/                 # Core libraries and reusable logic
│   │   ├── components/      # UI components (Atomic / modular)
│   │   ├── services/        # Supabase client, offline queue, sync engine
│   │   ├── stores/          # Svelte reactive stores
│   │   └── types/           # Type definitions
│   ├── App.svelte           # Root application component
│   └── main.js              # Application entrypoint & PWA registration
├── .env.example             # Template for required environment variables
├── PROJECT_ARCHITECTURE.md  # Core architectural reference
├── tailwind.config.js       # Tailwind CSS configuration
├── vite.config.js           # Vite & PWA configuration
├── vercel.json              # Vercel SPA routing and headers
└── package.json             # Project metadata & dependencies
```

---

## 5. Security & Environment Configuration
- All client-side environment variables must be prefixed with `VITE_` (e.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Serverless functions in `/api/` can securely access server-only secrets (e.g., `SUPABASE_SERVICE_ROLE_KEY`).
- Never expose the Supabase `service_role` key in client-side code or public repositories.
- Database access must always be secured with PostgreSQL Row Level Security (RLS) policies.
