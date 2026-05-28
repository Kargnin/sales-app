# Plan Review — Stitch-Style Admin Dashboard Redesign

## Verdict: CHANGES REQUESTED

The plan has the right general direction, but has 2 correctness/consistency issues that need resolution before implementation, plus several underspecified mechanics.

## Strengths
- The scope is well-focused: visual redesign of the admin dashboard only, no architectural refactoring
- All changes are localized to 3 files (`PageLayout.tsx`, `AdminDashboardPage.tsx`, `AppShell.tsx`/`.css`) with clear per-file descriptions
- The plan correctly identifies which styling tokens need updating (stat cards, visit list, tab bar)
- The mock-seed fallback idea for capturing the exact design look is noted, though needs a guard (see below)

## Issues to Address

### 1. CRITICAL: Mock data must be gated behind dev-mode check
- **Location**: Plan section 4 — "Seeded Mock Data Fallback"
- **Problem**: The plan proposes injecting fake visits (John Doe, Alice Smith, Robert Jones) as a fallback when the live database is empty. Without a dev-mode gate, real users with genuinely empty visit histories will see fabricated data — this is a data integrity issue.
- **Suggestion**: Gate the seed data behind `import.meta.env.DEV` (Vite's built-in env flag), or use a separate `showMockData` const that defaults to `false`. The seed data should only render in local development, never in production. Example:

```tsx
const useMockVisits = import.meta.env.DEV && recentVisits.length === 0;
const displayVisits = useMockVisits ? MOCK_VISITS : recentVisits;
```

### 2. CRITICAL: Use CSS custom properties, not hardcoded hex values
- **Location**: Plan sections 3, 4, 5, 6 — all color values
- **Problem**: The plan specifies raw hex colors (`#121212`, `#848281`, `#ff3e00`, `#FF9F0A`) throughout. The project already has a Stitch design token system via `var(--stitch-*)` CSS custom properties used consistently everywhere. Hardcoding hex values breaks the theming system and creates a maintenance split — changing the brand color would require hunting down hex values instead of updating one CSS variable.
- **Suggestion**: Map all colors to existing Stitch tokens:
  - `#121212` (black) → `var(--stitch-text-heading)` or `var(--stitch-midnight)`
  - `#848281` (gray) → `var(--stitch-text-muted)`
  - `#ff3e00`/`#af2800` (coral-red) → `var(--stitch-accent)` or `var(--stitch-secondary)`
  - `#FF9F0A`/`#D97706` (orange) → `var(--stitch-warning)` (if it exists) or define a new `--stitch-pending` token in CSS
  - `#F2F0ED` (light gray) → `var(--stitch-stone-border)` or `var(--stitch-surface-recessed)`
- If the exact Stitch design requires colors not yet in the token set, **add the tokens to `AppShell.css`** rather than inlining them.

### 3. MODERATE: Avatar → menu click wiring is underspecified
- **Location**: Plan sections 1 and 2 — `PageLayout.tsx` and avatar interaction
- **Problem**: The plan says to add `onAvatarClick` prop to `PageLayout` and have the mascot avatar trigger the side menu. But `PageLayout` has no access to the menu controller or menu ref (that's in `AppShell.tsx`). The plan doesn't explain the mechanism: does it use `menuController` from `@ionic/react`, or does it need a callback passed down from `AppShell`?
- **Suggestion**: Use Ionic's `menuController` — it's a global singleton that works anywhere. Import it in `AdminDashboardPage.tsx` and call `menuController.toggle()` on avatar click. This avoids threading a callback through `PageLayout`. Alternatively, keep the `IonMenuButton` visible and skip the `hideMenuButton`/`onAvatarClick` complexity entirely — the hamburger menu button is a standard, recognizable pattern that doesn't detract from the design.

### 4. MODERATE: StatCard color configurability
- **Location**: Plan section 3 — Pending Approvals stat
- **Problem**: The plan hardcodes "orange" for the Pending Approvals value specifically. If the component is reused elsewhere (or for the SalesmanDashboard later), this special-casing won't scale.
- **Suggestion**: Add an optional `valueColor?: string` prop to the inline `StatCard` component. Pass `var(--stitch-warning)` for Pending Approvals, default to `var(--stitch-text-heading)` for others. This keeps the component generic while achieving the design requirement.

### 5. LOW: Complete removal of stat card backgrounds may hurt readability
- **Location**: Plan section 3 — "completely strip the StatCard component of its elevated background, borders, and box shadow"
- **Problem**: Fully transparent stat cards rely entirely on the page background for contrast. If the background is `#fbfaf9` (var(--stitch-canvas)), white text or light-colored values could become hard to read. The current card backgrounds provide guaranteed contrast.
- **Suggestion**: Test with the actual page background. If contrast is sufficient, proceed. If not, use an extremely subtle background like `background: rgba(255,255,255,0.4)` or keep the cards but remove only the border and shadow. Accessibility needs sufficient contrast ratios (4.5:1 for normal text).

### 6. LOW: Re-learn from previous audit — watch for dead imports and duplicate components
- **Location**: General — all file changes
- **Problem**: The previous audit cycle found: (a) dead Ionic imports left after extracting `PageLayout`, (b) duplicate `StatCard`/`VisitRow` definitions between admin and salesman dashboards. This plan modifies the inline admin dashboard components again without extracting shared versions. The dead-imports issue from the last cycle was already fixed, but new changes to props/imports could reintroduce it.
- **Suggestion**: After implementation, run `npx tsc --noEmit --noUnusedLocals` to catch leftover imports. For the duplicate components, consider this a follow-up task rather than blocking this styling pass.

## Optional Improvements
- The `IonFab` positioning could use `--offset-bottom` to avoid overlapping with the tab bar (currently, `margin: '16px'` might not be enough on devices with safe areas).
- The "View All" link in Recent Visits points to `/visits` — verify this route exists and renders correctly.
- Consider extracting the tab bar styling into `AppShell.css` fully (currently the tab bar in `AppShell.tsx` has mixed inline styles and CSS class references).
