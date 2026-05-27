# DESIGN SYSTEM SPECIFICATION

## Register
`product`

## Design Direction & Scene
- **User Scene**: 
  - *Field Salesman*: A salesman is standing outside a small retail store in bright, direct afternoon sunlight. They are holding a mid-range Android phone, trying to quickly log a visit or place an order.
  - *Business Admin*: A distributor owner is sitting at their desk on a laptop, quickly checking salesmen check-ins, approving shops, or logging invoice payments.
- **Visual Identity**: Extremely clean, functional, high-density, flat, and razor-sharp. No over-decorated shadows, neon gradients, or decorative glassmorphism. Visual delight comes from extreme precision, speed, layout consistency, and high-contrast typography.
- **Ambience & Tone**: Restrained, trustworthy, and utilitarian. Tinted slate neutral theme with a single committed clean forest green/emerald accent reflecting soap and water cleanliness.

---

## 1. Color Palette (OKLCH Spec)

Our design system uses the modern `oklch()` color space to ensure robust accessibility, smooth lightness transitions, and excellent contrast compliant with WCAG AA/AAA.

```css
:root {
  /* neutrals (tinted toward forest green hue 155, chroma 0.006) */
  --neutral-50:  oklch(0.98 0.006 155);  /* Page Background (Light Mode) */
  --neutral-100: oklch(0.95 0.006 155);  /* Surface Secondary */
  --neutral-200: oklch(0.90 0.006 155);  /* Borders subtle */
  --neutral-300: oklch(0.80 0.006 155);  /* Borders default */
  --neutral-500: oklch(0.55 0.006 155);  /* Text muted / icons */
  --neutral-700: oklch(0.35 0.006 155);  /* Text secondary */
  --neutral-900: oklch(0.18 0.006 155);  /* Text primary (Light Mode) / Surface (Dark) */
  --neutral-950: oklch(0.10 0.006 155);  /* Page Background (Dark Mode) */

  /* brand accent - "forest/emerald soap" (committed forest green) */
  --accent-light: oklch(0.78 0.14 150);  /* Soft background tints */
  --accent-main:  oklch(0.62 0.16 150);  /* Primary buttons, selected states */
  --accent-dark:  oklch(0.48 0.14 150);  /* Hover states, dark text contrast */

  /* semantic signals (standardized contrast levels) */
  --success: oklch(0.65 0.18 140);       /* Success indicators / approved status */
  --warning: oklch(0.75 0.16 80);        /* Pending status / warnings */
  --error:   oklch(0.58 0.18 25);        /* Rejected status / error alerts */
  
  /* theme mappings */
  --bg-page: var(--neutral-950);
  --bg-surface: var(--neutral-900);
  --bg-surface-hover: oklch(0.22 0.006 155);
  --text-primary: var(--neutral-50);
  --text-secondary: var(--neutral-300);
  --text-muted: var(--neutral-500);
  --border-subtle: var(--neutral-900);
  --border-default: oklch(0.28 0.006 155);
  --border-focused: var(--accent-main);
}
```

---

## 2. Typography

- **System Font Stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"`
  - High performance, loads instantly, feels native on all platforms (Mac, Windows, iOS, Android).
- **Scale**: Fixed rem scale. A tighter typographic ratio (1.15) prevents layout noise.
  - Body: `1rem` (16px), line-height `1.5`, letter-spacing `0px`
  - Small / Labels: `0.875rem` (14px), weight `500` or `600`, letter-spacing `0.01em`
  - Tiny / Badges: `0.75rem` (12px), weight `700`, uppercase, letter-spacing `0.05em`
  - Subheadings: `1.25rem` (20px), weight `600`, letter-spacing `-0.01em`
  - Page Titles: `1.75rem` (28px), weight `700`, letter-spacing `-0.02em`

---

## 3. Spacing & Spatial Design

High-density grid spacing optimized for fast scanning.
- **Scale**: 
  - `4px` (`var(--space-2xs)`)
  - `8px` (`var(--space-xs)`)
  - `12px` (`var(--space-sm)`)
  - `16px` (`var(--space-md)`)
  - `24px` (`var(--space-lg)`)
  - `32px` (`var(--space-xl)`)
  - `48px` (`var(--space-2xl)`)
- **Visual Grid**: Predictable alignments. Forms always use vertical columns. Multi-column dashboards use structural flex/grid containers that scale responsively.
- **Elevation**: No heavy shadows. Flat cards with distinct borders (`1px solid var(--border-default)`) perform better in bright sunlight. High-glare environments require clear border indicators rather than soft box-shadows.

---

## 4. UI Absolute Bans (Applying Impeccable Design Laws)

- **No Side-Stripe Cards**: Standard flat borders only.
- **No Text Gradients**: Titles are pure high-contrast solid colors.
- **No Glassmorphism**: Surface overlays are flat, solid, high-performance colors.
- **No SaaS Cliché Metres**: Simple, flat indicators showing clean numbers.
- **No Inconsistent Modals**: Prioritize inline panels, split grids, and slide-in drawers.
- **No Decorative Animations**: Transitions are limited to fast CSS property changes (120-180ms) for real-time state changes only.
