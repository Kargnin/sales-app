# Antigravity Learnings Log

## [2026-05-28] Admin Dashboard UI via Stitch Design

### Pattern: Leftover Dead Imports After Refactoring
- **What happened**: After extracting shared `PageLayout` component that handles `IonPage`, `IonHeader`, `IonToolbar`, `IonContent`, Antigravity left the old Ionic component imports in 3 files (`AdminDashboardPage.tsx`, `SalesmanDashboardPage.tsx`, `AppShell.tsx`) plus unused icon imports. Also left `IonIcon` from `AppShell.tsx` after switching tabs to Material Symbols spans.
- **Root cause**: When extracting a shared wrapper, Antigravity updates the JSX but does not clean up the imports that became dead as a result.
- **Fix applied**: Removed all unused imports across 4 files (`AdminDashboardPage.tsx`, `SalesmanDashboardPage.tsx`, `AppShell.tsx`, `StatCard.tsx`). Moved mid-file imports to the top.
- **Rule to add**: "After extracting a shared layout/utility component, verify that the original files no longer import the components that were moved into the shared abstraction. Run `npx tsc --noEmit --noUnusedLocals` to catch leftover imports."

### Pattern: Mid-File Imports
- **What happened**: Both `AdminDashboardPage.tsx` and `SalesmanDashboardPage.tsx` had `import { PageLayout } from '../../components/layout/PageLayout.js'` placed in the middle of the file (between component definitions), rather than at the top with all other imports.
- **Root cause**: Antigravity seems to append new imports near the code that uses them rather than consolidating at the top of the file.
- **Fix applied**: Moved `PageLayout` imports to the top of both files with other imports.
- **Rule to add**: "All import statements must be at the top of the file, before any component/function definitions. Do not place imports in the middle of files."

### Pattern: Styles/Object Definitions Below Their Usage
- **What happened**: In `AdminDashboardPage.tsx`, the `const styles` object used by `StatCard` was defined at the bottom of the file (after the main export), while `StatCard` was defined at the top. Technically safe at runtime due to module evaluation order, but violates top-down readability.
- **Root cause**: Antigravity defined the component first then added the styles object later, or placed it with other "module-level" items at file end.
- **Fix applied**: Moved `styles` above `StatCard`.
- **Rule to add**: "Module-level constants/variables should be defined before the code that references them, maintaining top-down readability."

### Pattern: Duplicate Component Definitions Across Roles
- **What happened**: `AdminDashboardPage.tsx` defines its own inline `StatCard` and `VisitRow` components with one API shape, while `SalesmanDashboardPage.tsx` imports shared versions from `./components/` with a different API shape. This is inconsistent and creates maintenance burden.
- **Root cause**: Antigravity built the admin dashboard from scratch without noticing that the salesman dashboard already had extracted shared sub-components. CLAUDE.md says "extract out common rendering components" but Antigravity didn't cross-check.
- **Fix applied**: Not fixed (requires design decision). Flagged for user consideration.
- **Rule to add**: "Before creating a component, check if an equivalent already exists in the codebase (search for similar component names and file paths). Reuse or adapt existing components rather than duplicating."

### Pattern: No Tests for New UI Components
- **What happened**: The new `AdminDashboardPage.tsx` has zero test coverage. The walkthrough reported "all existing tests pass" but didn't add or update tests for the new code.
- **Root cause**: Antigravity treats "existing tests still pass" as sufficient verification without adding tests for new components.
- **Fix applied**: Not fixed (out of scope for this audit cycle). Flagged for user consideration.
- **Rule to add**: "For any new page-level component, add at minimum a smoke test that verifies: the component renders without errors, loading state displays correctly, and empty state displays correctly."

---

## [2026-05-28] Stitch-Style Admin Dashboard Redesign (2nd Cycle)

### Pattern: Missing Tests (2nd occurrence)
- **What happened**: Same as previous cycle — `AdminDashboardPage.tsx` was substantially redesigned (new StatCard API, avatar click handler, mock data fallback, `hideMenuButton` prop) but no tests were added. The 42 existing tests continue to pass, but the new code paths are untested.
- **Root cause**: Antigravity consistently treats "existing tests pass" as sufficient, even when significant new behavior is added.
- **Fix applied**: None (behavioral, not a bug). Flagged in audit.
- **Rule to add**: Reinforces previous rule. Pattern is recurring — consider making AGENTS.md testing requirement stronger.

### Pattern: Duplicate Component Definitions Across Roles (2nd occurrence)
- **What happened**: The inline `StatCard` in `AdminDashboardPage.tsx` was redesigned with a new API shape (`subtext`, `subtextIcon` as strings, `iconColor` required), while the shared `StatCard` in `features/dashboard/components/` kept its old API (`icon` as Ionicon, `trend` object, `iconColor` as key). The gap between the two implementations widened further.
- **Root cause**: Antigravity works file-by-file and does not cross-check that equivalent components exist elsewhere with different APIs. The `AdminDashboardPage` inline components and the `SalesmanDashboardPage` shared components have now fully diverged.
- **Fix applied**: None (requires architectural decision). Flagged in audit.
- **Rule to add**: Reinforces previous rule. "Before modifying a component, search the codebase for other files that define or import components with the same name (e.g., `StatCard`, `VisitRow`) and either unify them or document the divergence."

### Pattern: Inline Styles Instead of CSS Classes (New)
- **What happened**: Both `PageLayout.tsx` and `AdminDashboardPage.tsx` use inline `style={{}}` objects exclusively, while the project has `AppShell.css` with well-organized, token-aware CSS classes (`.stat-card`, `.visit-row`, `.page-toolbar`, etc.). The existing CSS classes are now partially orphaned — used by `SalesmanDashboardPage` but ignored by `AdminDashboardPage`.
- **Root cause**: Antigravity defaults to inline styles in JSX rather than checking for existing CSS class patterns. This is faster to write but fragments the styling approach.
- **Fix applied**: None (consistency cleanup would be a separate task).
- **Rule to add**: "Before adding inline styles, check if the project's CSS file already has classes for the elements you're styling. If they exist, use them. If they don't exist, add new CSS classes rather than inline styles."

### Pattern: Surplus Dev-Mode Mock Data Seeding (New)
- **What happened**: The review requested mock visit data for dev mode. Antigravity extended this to seed mock values for ALL stats (Total Sales → `$24.5k`, Active Salesmen → `42`, Pending Approvals → `8`, Total Visits → `156`). This is a creative extension of the suggestion but adds more dev-mode code paths than requested.
- **Root cause**: Antigravity over-applies a pattern — if one stat benefits from mock data, all stats should have it. The overhead is minor (5 extra lines per stat) but it's scope expansion without asking.
- **Fix applied**: None (the mock data is correctly gated behind `import.meta.env.DEV` and is harmless).
- **Rule to add**: "When a review asks for a dev-mode fallback in one place, implement only what was requested. If other similar places could benefit, note them in the walkthrough rather than expanding scope unilaterally."

---

## [2026-05-28] Ionic + Tailwind Integration Cleanup

### Pattern: Tailwind Classes on Ionic Host Elements That Don't Penetrate Shadow DOM (New)
- **What happened**: `AppShell.tsx` applied Tailwind classes (`bg-[var(--stitch-canvas)]`, `border-t`, `border-[var(--stitch-stone-border)]`, `shadow-none`, `flex`, `justify-around`, `items-center`) directly to `IonTabBar` and `bg-transparent` to `IonTabButton`. These classes only affect the host element's surface — they cannot style the shadow DOM internals where Ionic's actual tab bar rendering lives. Ionic components use CSS custom properties (`--background`, `--color`, etc.) to expose styling hooks into the shadow DOM.
- **Root cause**: Antigravity treats Ionic components like regular DOM elements and applies Tailwind classes to them, unaware that Ionic uses shadow DOM which blocks class-based styling from penetrating.
- **Fix applied**: Removed all Tailwind classes from `IonTabBar` host. Removed `bg-transparent` from `IonTabButton`. Tab bar styling is now exclusively in CSS files via Ionic CSS custom properties (`--background: var(--stitch-canvas)`, `--color-selected: var(--stitch-accent)`, etc.) and `::part(native)` for shadow DOM penetration.
- **Rule to add**: "Ionic components (IonTabBar, IonTabButton, IonToolbar, IonHeader, IonContent, IonItem, etc.) use shadow DOM. Do NOT apply Tailwind classes for visual styling (backgrounds, borders, shadows, colors) to Ionic component host elements — they won't penetrate. Instead, use Ionic CSS custom properties (`--background`, `--color`, `--border-color`, etc.) in CSS files. Tailwind classes are safe for light DOM content inside slots (divs, spans, headings) and for slotted host elements' layout properties (`flex-1`, `h-full`)."

### Pattern: Inline Ionic CSS Properties Duplicating Global CSS (New)
- **What happened**: `PageLayout.tsx` set Ionic CSS custom properties (`--background`, `--border-color`, `--padding-*`, `--background` on IonContent) via inline `style={{}}` objects. The same properties were already defined globally in `index.css` (`ion-toolbar { --background: ... }`, `ion-content { --background: ... }`). This created redundant overrides that made the styling harder to trace.
- **Root cause**: Antigravity added inline styles to the layout wrapper component without checking whether global CSS already handled those properties.
- **Fix applied**: Removed inline Ionic CSS property overrides from `IonToolbar` and `IonContent`. Toolbar padding replaced with standard CSS padding on an inner div. `IonContent` now only receives user-provided `contentStyle`.
- **Rule to add**: "Before adding inline Ionic CSS custom properties to a component, check `index.css` and `AppShell.css` to see if global rules already set them. Only add overrides for values that genuinely differ from the global defaults."

### Pattern: Programmatic menuController Instead of Declarative IonMenuButton (New)
- **What happened**: The admin dashboard avatar used `menuController.toggle('start')` imported from `@ionic/core` to programmatically open the side menu. This works but bypasses Ionic's declarative component pattern.
- **Root cause**: Antigravity reached for the imperative API rather than using the existing `IonMenuButton` component that wraps any content and natively toggles the menu.
- **Fix applied**: Wrapped the mascot avatar in `<IonMenuButton autoHide={false}>` and removed the `menuController` import and click handler. The `IonMenuButton` renders the mascot image as its content (replacing the default hamburger icon) and toggles the menu via Ionic's built-in mechanism.
- **Rule to add**: "Prefer Ionic's declarative components (IonMenuButton, IonBackButton, IonRouterLink) over imperative APIs (menuController, navController). The declarative components handle edge cases (auto-hide when menu unavailable, accessibility, platform adaptation) that imperative code may miss."
