# Implementation Plan — Stitch-Style Admin Dashboard Redesign (Reviewed)

The objective is to redesign the Admin Dashboard (including its top bar, borderless stats, recent visits list, and bottom tab bar) to look 100% identical to the premium, minimalist design of the Stitch dashboard mockup.

## Incorporated Review Suggestions

> [!IMPORTANT]
> The following improvements have been incorporated following review:
> - **Dev-Mode Mock Gating**: Seed/fallback data is gated behind Vite's `import.meta.env.DEV` to guarantee data integrity in production.
> - **Stitch Token Mapping**: All raw hex colors are mapped to existing `--stitch-*` CSS custom properties, preserving the theming system.
> - **Ionic MenuController Integration**: Opened the menu drawer using Ionic's global `menuController` singleton directly in the avatar click handler of the dashboard page.
> - **Reusable StatCard Color Control**: Added a `valueColor` prop to the `StatCard` component to allow clean configurability (e.g. orange warn color for Pending Approvals).
> - **Unused Imports Clean-up**: Included static analysis checks using `tsc` to verify no leftover dead imports.

---

## Proposed Changes

### 1. Conditionally Hide Generic Hamburger
Modify `client/src/components/layout/PageLayout.tsx` to:
- Accept a new optional prop `hideMenuButton?: boolean`.
- Allow the page layout to hide the generic hamburger icon when a custom menu trigger (such as the mascot avatar) is desired.

### 2. Header and Top Bar Redesign
Modify `client/src/features/dashboard/AdminDashboardPage.tsx` to:
- Style the mascot avatar as a clean, rounded circle on a white/transparent background with a subtle border:
  - Width/height: 40px
  - Cursor pointer
- Open the side menu drawer by importing and calling Ionic's global `menuController.toggle('start')` on avatar click.
- Standardize the `Good morning, Partner` title typography using the premium bold font style from the mockup (`color: 'var(--stitch-text-heading)'`, weight `600`, size `23px`).
- Refactor the notification bell slot to match the mockup exactly: a white circle with a thin light-gray border (`1px solid var(--stitch-stone-border, #f2f0ed)`) and an outline notifications icon.

### 3. Overview Stat Cards
Modify `client/src/features/dashboard/AdminDashboardPage.tsx` to:
- Update the inline `StatCard` component:
  - Add an optional `valueColor?: string` prop.
  - Default value color to `var(--stitch-text-heading)`.
- Strip the `StatCard` elements of their elevated backgrounds, shadows, and solid borders to match the clean, borderless transparent style.
- Map all visual properties to Stitch variables:
  - **Label**: `var(--stitch-text-muted)`, size `13px`, regular weight.
  - **Value**: font size `32px`, bold/medium weight.
  - **Trends / Subtext**: font size `12px`/`13px`, weight `400` or `500`.
- Pass custom tokens for the stats:
  - `Total Sales`: value is `var(--stitch-text-heading)`, trend line is `var(--stitch-success)` with dynamic up-right trend indicator `↗ +12%`.
  - `Active Salesmen`: value is `var(--stitch-text-heading)`, subtext `Online now` in `var(--stitch-success)` with people icon.
  - `Pending Approvals`: pass `valueColor: 'var(--stitch-warning, #ffbb26)'`, subtext `New shops` in `var(--stitch-warning)` with storefront icon.
  - `Total Visits`: value is `var(--stitch-text-heading)`, subtext `This week` in `var(--stitch-text-muted)` with calendar icon.
- Lay them out in a responsive CSS Grid with `gap: 24px 16px` on mobile.

### 4. Borderless Recent Visits Timeline
Modify `client/src/features/dashboard/AdminDashboardPage.tsx` to:
- Remove the card background, border, shadow, and inner padding from the visits container to make it a flat, borderless list on the canvas.
- Format each `VisitRow` exactly like the design diagram:
  - **Avatar**: `width: 44px, height: 44px`, circle with gray background (`var(--stitch-stone-border)` or `var(--stitch-surface-recessed)`), bold initials in `var(--stitch-text-heading)`.
  - **Middle**: Name in semibold `var(--stitch-text-heading)` text, and shop name line in `var(--stitch-text-muted)` with storefront icon.
  - **Right**: Status in `var(--stitch-text-heading)` for Completed, or `var(--stitch-warning)` for In Progress. Time in `var(--stitch-text-muted)` underneath status.
  - Separated by thin `1px solid var(--stitch-stone-border)` lines between rows.
- **Vite-Gated Dev Mock Fallback**: Gate the fallback mock visits behind `import.meta.env.DEV` to safeguard real empty production history. If database visits are empty in local dev-mode:
  ```tsx
  const useMockVisits = import.meta.env.DEV && recentVisits.length === 0;
  const displayVisits = useMockVisits ? MOCK_VISITS : recentVisits;
  ```
  Where `MOCK_VISITS` is populated with the exact three items from the screenshot.

### 5. Floating Action Button
Modify `client/src/features/dashboard/AdminDashboardPage.tsx` to:
- Style the `IonFab` "+ New Product" button as a pill button with a solid black (`var(--stitch-midnight)`) background, white plus sign, and white text, floating elegantly above the tab bar.

### 6. Bottom Navigation Drawer (Tab Bar)
Modify `client/src/components/layout/AppShell.tsx` and `client/src/components/layout/AppShell.css` to:
- Style the `IonTabBar` with a flat, off-white background (`var(--stitch-canvas)`), very thin top border (`var(--stitch-stone-border)`), and no shadows.
- Set the active tab highlight color to `var(--stitch-accent)` for the icon and label.
- Set the inactive tabs in standard muted gray `var(--stitch-text-muted)` with outline icons.
- Add CSS rules to automatically transition the active tab's material icon to filled (`font-variation-settings: 'FILL' 1`), while keeping other icons in their outline state.

---

## Verification Plan

### Manual Verification
1. Open the Admin Dashboard page in the browser.
2. Confirm the top bar matches the Stitch mockup perfectly (no hamburger icon, avatar opens side menu drawer, "Good morning, Partner", outline bell in a thin gray circular frame).
3. Verify the Overview stats are completely borderless and match the grid, with Pending Approvals value set to orange.
4. Verify the Recent Visits list is borderless and displays mockup visits in local development, and live visits if populated.
5. Confirm that the floating "+ New Product" button is a beautiful solid black pill.
6. Verify that the bottom tab bar uses the active coral-red color, is flat with no drop shadow, and active icon is filled.

### Automated Checks
- Run compilation checks: `npx tsc --noEmit --noUnusedLocals` in the client folder to guarantee zero compilation errors or unused variables.
