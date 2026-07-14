# Plagiarism Report UI Enhancement Plan

## Overview

Implement the priority-ranked design improvements to the plagiarism report generation section. The current implementation uses Tailwind CSS v4 with a stark monochrome theme (Vercel/Linear-inspired), Geist Sans/Geist Mono fonts, shadcn/ui components, Framer Motion, and Recharts. All changes respect this existing stack.

## Current Stack Reference

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`, config via CSS `@theme inline`)
- **Fonts:** Geist Sans (`--font-sans`), Geist Mono (`--font-mono`) via `next/font/google`
- **UI Components:** shadcn/ui (Card, Badge, Button, Table, Input, Progress, etc.)
- **Animation:** Framer Motion
- **Charts:** Recharts (PieChart, BarChart)
- **Theme:** Light/Dark mode via `next-themes`, oklch color space
- **Report Page:** `app/(dashboard)/reports/[jobId]/page.tsx`
- **Summary Component:** `components/reports/report-summary.tsx`
- **Charts Component:** `components/reports/report-charts.tsx`
- **Comparison Viewer:** `components/reports/comparison-viewer.tsx`
- **Sources Table:** `components/reports/matched-sources-table.tsx`
- **Download Button:** `components/reports/download-report-button.tsx`
- **Scan Progress:** `components/scanner/scan-progress-tracker.tsx`

---

## Phase 1: Animated Score Gauge + Count-Up Animation

### 1.1 Create `AnimatedScoreGauge` Component

**New file:** `components/reports/animated-score-gauge.tsx`

Build a semi-circular SVG gauge (not a donut) that replaces the existing pie chart in ReportCharts.

**Visual spec:**
- Semi-circle arc spanning 180 degrees
- Background track: 180-degree arc in `hsl(var(--muted))` at 20% opacity
- Foreground arc: animated from 0 to `originalityScore` using Framer Motion's `useMotionValue` + `animate()` with `easeOut` over 1.5s
- Glow filter (`feGaussianBlur`) on the foreground arc for depth
- Center text: large percentage in `font-mono` with count-up animation effect
- Subtitle: "Original Content" in `text-xs uppercase tracking-wider text-muted-foreground`

**Animation flow:**
1. On mount/view enter: foreground arc draws from 0% to value (spring physics)
2. Center number counts from 0 to `originalityScore` with a matching duration
3. On completion: subtle 200ms ring pulse outward (scale 1.0 → 1.05 → 1.0)

**Color logic (respecting existing theme):**
- Score >= 90%: `hsl(var(--chart-2))` mapped to green (override chart-2 in `:root` and `.dark`)
- Score 70-89%: amber tone
- Score < 70%: `hsl(var(--destructive))`

**Implementation approach:**
- Use `useRef` + `useEffect` to find the arc path length, then animate `strokeDashoffset`
- Framer Motion's `motion.path` with custom `pathLength` animation
- Count-up hook: `useMotionValue(0)` → `animate(originalityScore, { duration: 1.5, ease: "easeOut" })` + `useTransform` to format

### 1.2 Replace Pie Chart with Gauge in `report-charts.tsx`

**Modify:** `components/reports/report-charts.tsx`

- Remove `PieChart` import (keep `BarChart` imports)
- Replace the "Content Composition" card (chart #1) with `<AnimatedScoreGauge score={originalityScore} />`
- Keep charts #2 and #3 (Source Distribution, Similarity Type) as bar charts
- Update grid layout to `lg:grid-cols-3` with gauge taking full width on mobile, 2/3 on desktop (bento-style)

### 1.3 Risk-Based Chart Color Variables

**Modify:** `app/globals.css`

Add risk-aware OKLCH color variables to `:root` and `.dark` blocks:

```css
:root {
  --risk-low: oklch(0.75 0.15 145);    /* green-500 equivalent */
  --risk-medium: oklch(0.75 0.15 80);   /* amber-500 equivalent */
  --risk-high: oklch(0.65 0.2 25);      /* red equivalent */
  --chart-glow: oklch(0.14 0 0 / 0.08); /* subtle shadow */
}

.dark {
  --risk-low: oklch(0.7 0.15 145);
  --risk-medium: oklch(0.75 0.15 80);
  --risk-high: oklch(0.65 0.2 25);
  --chart-glow: oklch(0.98 0 0 / 0.06);
}
```

These are referenced in the gauge and future heatmap/glow effects.

---

## Phase 2: Typography Upgrade

### 2.1 Add Display Font

**Modify:** `app/layout.tsx`

Add `next/font/google` import for a display/heading font:

```ts
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700"],
});
```

Include `spaceGrotesk.variable` in the `<html>` className alongside existing fonts.

### 2.2 Register Display Font in Theme

**Modify:** `app/globals.css`

Add to `@theme inline`:
```css
--font-display: var(--font-display);
```

### 2.3 Apply Typography Hierarchy

**Modify across all report components:**

| Location | Change |
|----------|--------|
| `report-summary.tsx` metric titles | Add `uppercase tracking-widest text-[11px]` |
| `report-summary.tsx` metric values | Change to `text-4xl font-mono font-bold tracking-tighter` |
| `report-charts.tsx` section heading | Add `font-display uppercase tracking-widest` |
| `report-charts.tsx` chart card titles | Add `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| `comparison-viewer.tsx` card title | Add `font-display` |
| `matched-sources-table.tsx` headers | Add `text-[11px] font-semibold uppercase tracking-wider` |
| `scan-progress-tracker.tsx` stage labels | Add `font-mono text-xs` for percentages |

---

## Phase 3: Risk-Based Color Theming

### 3.1 Dynamic Metric Card Styling

**Modify:** `components/reports/report-summary.tsx`

Replace the flat emerald/amber/blue metric icons with risk-aware color mapping:

- Add a `getRisk colors(score)` helper returning `{ text, bg, glow }` classes
- The "Originality Score" card uses risk colors dynamically
- Each card gets a 4px top accent bar using `border-t-4` with the risk color
- On hover: card lifts with `shadow-lg` + icon rotates 360° (transition-all duration-500)

### 3.2 Hero Score Panel

**New file:** `components/reports/hero-score-panel.tsx`

Create a full-width hero section that sits above the metric cards in the report page:

**Layout (desktop):**
```
┌──────────────────────────────────────────────────┐
│ [AnimatedScoreGauge]   │  Key Insights Text     │
│    (40% width)         │  - Risk level badge    │
│                        │  - Match count          │
│                        │  - Word count           │
│                        │  - AI summary (if any)  │
└──────────────────────────────────────────────────┘
```

**Visual:**
- Subtle gradient background based on risk level (green glow for low, red tint for high)
- `bg-gradient-to-br from-background via-background to-[risk-color]/5`
- Animated border: 1px solid with opacity pulse on the risk color
- Background animation: slow gradient shift using `@keyframes gradient-shift` in globals.css

**Integration:** Import and render in `[jobId]/page.tsx` between `<PageHeader>` and `<ReportSummary>`.

---

## Phase 4: Progressive Disclosure Scroll Animations

### 4.1 Enhance Existing Framer Motion Usage

**Modify:** `app/(dashboard)/reports/[jobId]/page.tsx`

Wrap each major section with scroll-triggered animation:

```tsx
<motion.section
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-80px" }}
  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
>
  <ReportSummary ... />
</motion.section>
```

Apply to:
1. Hero score panel (no delay)
2. Metric cards summary (delay 0.1s)
3. Charts section (delay 0.2s)
4. Comparison viewer (delay 0.1s)
5. Detailed findings heading + table (delay 0.15s)

### 4.2 Chart Container Entrance

**Modify:** `components/reports/report-charts.tsx`

Change the `containerVariants` stagger from 0.15s to use a spring-based entrance per card that triggers on scroll, not just on mount. Replace the `initial="hidden" animate="show"` with `whileInView="show"` and `initial="hidden"`.

---

## Phase 5: Bento Grid Chart Layout

### 5.1 Asymmetric Grid

**Modify:** `components/reports/report-charts.tsx`

Change the chart grid from uniform 3-col to bento:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Gauge: spans 2 columns */}
  <motion.div className="lg:col-span-2">
    <AnimatedScoreGauge ... />
  </motion.div>
  
  {/* Similarity Type: 1 column */}
  <motion.div className="lg:col-span-1">
    {/* Similarity bar chart */}
  </motion.div>
  
  {/* Source Distribution: full width below */}
  <motion.div className="lg:col-span-3">
    {/* Source distribution bar chart */}
  </motion.div>
</div>
```

### 5.2 Card Depth Effect

**Modify:** `components/reports/report-charts.tsx` (and propagate to other chart cards)

Enhance chart cards with:
- `hover:shadow-xl hover:-translate-y-1 transition-all duration-300`
- Subtle backdrop blur: `bg-card/80 backdrop-blur-sm`
- Top accent line: `before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-[risk-color] before:to-transparent`

---

## Phase 6: Sticky Sidebar Navigation

### 6.1 Create `ReportSidebarNav` Component

**New file:** `components/reports/report-sidebar-nav.tsx`

A sidebar that sticks during scroll on the report detail page:

**Contents:**
- Mini score gauge (small circle, 60px)
- Nav links with active indicator:
  - Executive Summary
  - Analysis Breakdown
  - Comparison Viewer
  - Detailed Findings
- Export PDF button at bottom

**Interaction:**
- Uses `IntersectionObserver` (via `useInView` from framer-motion) to highlight active section
- Click scrolls to section with `scrollIntoView({ behavior: 'smooth' })`
- Active indicator: animated left bar that slides between items (Framer Motion `layoutId`)

**CSS:** Fixed position on lg+ screens, hidden below lg (collapsed to a floating button on mobile).

**Integration:** Modify `[jobId]/page.tsx` layout to use CSS grid: sidebar (fixed 240px) + main content area.

---

## Phase 7: Metric Card Depth + Hover Effects

### 7.1 Enhance ReportSummary Cards

**Modify:** `components/reports/report-summary.tsx`

Per metric card:
1. **3D tilt on hover:** Use `onMouseMove` with `rotateX/rotateY` transforms (max 5°)
2. **Colored top bar:** 3px gradient strip matching metric's semantic color
3. **Icon rotation:** 360° spin on card hover (`group-hover:rotate-[360deg] transition-transform duration-500`)
4. **Background shimmer:** Animated gradient sweep from left to right on hover (CSS `::after` pseudo-element)
5. **Number emphasis:** When score is loaded, numbers get a subtle `animate-pulse` that settles after 2s

---

## Phase 8: Heatmap Visualization

### 8.1 Create `SimilarityHeatmap` Component

**New file:** `components/reports/similarity-hemap.tsx`

A treemap-style visualization where:
- Each rectangle = one matched source
- Rectangle **area** ∝ number of matched words
- Rectangle **color intensity** ∝ similarity score (use `oklch` with varying lightness)
- Hover: card with source details (domain, exact similarity %, matched text preview)
- Click: scrolls to and highlights the corresponding match in the ComparisonViewer

**Implementation:** Use Recharts custom shape render on a ScatterChart, or hand-roll with absolute-positioned divs using a simple treemap algorithm (squarified). For simplicity, start with a squarified layout using `d3-hierarchy` if available, or a row-packing fallback.

**Integration:** Add as a 4th chart card in the bento grid, either above or below the existing bar charts.

---

## Phase 9: Source Hover Preview Cards

### 9.1 Enhance MatchedSourcesTable

**Modify:** `components/reports/matched-sources-table.tsx`

On hover over source domain/link column, show a popover with:
- Source favicon (via `https://www.google.com/s2/favicons?domain=...`)
- Full domain name with `external-link` icon
- Similarity score badge (colored)
- First 80 chars of matched text
- "View on Comparison Viewer" link

**Implementation:** Use shadcn `Popover` (if available) or build with Framer Motion `AnimatePresence` + absolute positioning. Use the existing `Tooltip`/`TooltipTrigger`/`TooltipContent` from `@/components/ui/tooltip`.

---

## Phase 10: Network Graph (Lower Priority)

### 10.1 Optional: Force-Directed Graph

**New file:** `components/reports/source-network-graph.tsx` (if time permits)

Depends on installing `react-force-graph-2d` or `d3-force`. Show central "Your Document" node connected to source nodes. Drag-to-interact.

**Note:** Only implement if the existing heatmap (Phase 8) is insufficient for visual impact. This is the lowest priority item.

---

## Key Implementation Rules

1. **No new color tokens in `:root` unless added to both `:root` AND `.dark`** — the app supports theme switching.
2. **All new animations use Framer Motion** — no mixing animation libraries.
3. **All new components follow shadcn/ui patterns** — same prop conventions, `cn()` from `@/lib/utils`, forwarded refs.
4. **Tailwind v4 syntax:** Use `bg-[var(--risk-low)]` for dynamic colors, not inline styles.
5. **Google Fonts via `next/font/google`** — same pattern as existing Geist fonts in `layout.tsx`.
6. **No external CSS files** — all custom keyframes go in `globals.css` under `@layer` or direct `@keyframes`.

---

## Validation

After each phase completes:
- Run `npx tsc --noEmit` for type checking
- Verify both light and dark themes render correctly
- Check mobile responsiveness (320px, 768px, 1024px+ breakpoints)
- Verify animations don't cause layout shift (no content jumping)
- Test report page loads with 0 matches (empty state preserved)
