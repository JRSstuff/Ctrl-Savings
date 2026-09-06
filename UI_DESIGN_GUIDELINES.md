# Ctrl+Savings - UI & Design System Guidelines

This document serves as the permanent memory for UI design, color contrast, geometry, and component layout.

---

## 1. Absolute Contrast Rules (Zero Tolerance for Blending)

### Dark Theme (Green + Black)
- **Background**: `#09090b` (Deep matte black).
- **Cards / Containers**: `#121215` with `#27272a` subtle border. NEVER use stark white cards on black backgrounds.
- **Primary Text & Headings**: `#ffffff` (Pure crisp white, >18:1 contrast).
- **Secondary Text & Captions**: `#a1a1aa` (Zinc 400, >7:1 contrast).
- **Accent & Highlights**: `#4ade80` / `#22c55e` (Bright vibrant emerald, >10:1 contrast).
- **STRICT PROHIBITION**: NEVER use dark green (`#0a4733`) or dark teal on black/dark surfaces. It is completely invisible.
- **Form Controls & Dropdowns (e.g. Sort button)**: Must use dark theme styling (`bg-zinc-900 text-zinc-200 border-zinc-700`).

### Light Theme (Green + White)
- **Background**: `#f7f9f7` (Clean pale sage / off-white).
- **Cards**: `#ffffff` with `#e2e8f0` crisp border.
- **Primary Text & Headings**: `#0a4733` (Deep forest green, >8.5:1 contrast).
- **Secondary Text & Captions**: `#475569` (Slate 600, >6:1 contrast).
- **Accents & Active Elements**: `#0a4733` or `#065f46`.

---

## 2. No Artificial / AI Clutter
- **No Unnecessary Boxes**: Do NOT place random boxed buttons (like `<button ...>DARK</button>`) on the screen. Keep the interface clean, functional, and authentic.
- **No Static Glows or Excessive Gradients**: No fuzzy ambient glowing blurs. High contrast, sharp borders, clean geometry.
- **1-Word Terse Copywriting**: Labels must be punchy and direct.

---

## 3. Bottom Navigation Bar Architecture
- **Floating Center FAB (`+`)**: Must be mathematically dead-center (`absolute left-1/2 -translate-x-1/2`).
- **Icon Container Normalization**: Every navigation icon must be placed inside an identical `w-6 h-6 flex items-center justify-center` container.
- **Identical Text Baselines**: All labels (`Home`, `Savings`, `Profile`) must share the exact same typography (`text-[10px] font-bold leading-none`).
- **Clear Active / Inactive States**:
  - Active: `#ffffff` with vibrant indicator.
  - Inactive: `#a1a1aa` (clear readable light zinc).
- **Scroll Clearance**: Main content scroll container must have minimum `pb-32` so floating bottom navigation never awkwardly overlaps cards.
