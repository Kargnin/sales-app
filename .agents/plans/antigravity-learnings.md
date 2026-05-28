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

---

## [2026-05-28] Stitch-Style Admin Dashboard & Login UI Redesign (Client + Server)

### Pattern: Web-Oriented Packages Installed in React Native/Expo Project
- **What happened**: Antigravity added `tailwindcss@^4.0.0`, `postcss@^8.5.15`, and `@tailwindcss/postcss@^4.0.0` as devDependencies to the Expo client package. These are web-oriented PostCSS packages that conflict with NativeWind v5 + `react-native-css`, which processes styling through Metro rather than PostCSS. The Expo bundler attempted PostCSS processing and failed with "It looks like you're trying to use tailwindcss directly as a PostCSS plugin."
- **Root cause**: Antigravity doesn't distinguish between web Tailwind (which uses PostCSS) and React Native NativeWind v5 (which uses Metro + react-native-css). It treated styling setup as if this were a web project.
- **Fix applied**: Removed `tailwindcss`, `postcss`, and `@tailwindcss/postcss` from `client/package.json` devDependencies. These packages are not needed for NativeWind v5.
- **Rule to add**: "DO NOT install `tailwindcss`, `postcss`, or `@tailwindcss/postcss` in Expo/React Native projects using NativeWind v5. NativeWind v5 + react-native-css processes Tailwind config through Metro, not PostCSS. These web-oriented packages actively break the Metro bundler. The only CSS-related dependency needed is `nativewind` and `react-native-css`."

### Pattern: NativeWind v4 Config Syntax with v5 (New)
- **What happened**: `client/tailwind.config.ts` used `presets: [require("nativewind/preset")]`, which is NativeWind v4 syntax. NativeWind v5 does not export a `preset` subpath — the tailwind config is processed directly by `react-native-css` via Metro without needing a preset declaration.
- **Root cause**: Antigravity applied NativeWind v4 configuration patterns without checking the v5 documentation for breaking changes.
- **Fix applied**: Removed the `presets` line and the `import type { Config } from "tailwindcss"` + `satisfies Config` annotation.
- **Rule to add**: "When upgrading or working with NativeWind v5, do NOT use `presets: [require('nativewind/preset')]`. This export no longer exists. The tailwind config is consumed directly by react-native-css. Check the installed NativeWind version and read its specific docs before writing config."

### Pattern: Vague/Wrong Walkthrough Claims About Styling Approach
- **What happened**: The walkthrough claimed components were "refactored to use Tailwind text and background color classes instead of custom style objects" and had "zero hardcoded hex codes." In reality: (a) all components use inline `style={{}}` objects, not Tailwind classNames, (b) colors are imported from `tailwindConfig.theme.extend.colors` rather than hardcoded, but (c) the overall approach is JS style objects, not NativeWind className-based styling.
- **Root cause**: Antigravity conflates "using color tokens from a config file" with "using Tailwind classNames." The walkthrough oversells what was actually implemented.
- **Fix applied**: Corrected in audit. The color tokenization via tailwind config is a valid improvement over hardcoded hex values, but the walkthrough should accurately describe the approach used.
- **Rule to add**: "In walkthroughs, be precise about the styling approach used. 'Color tokenization via tailwind.config.ts' is accurate; 'Tailwind classNames' implies `className='bg-white text-charcoal'` which is a different pattern. Do not conflate these."

---

## [2026-05-28] Side Navigation Menu Drawer

### Pattern: Zustand Store Destructuring Without Selectors (New)
- **What happened**: `SideMenu.tsx` destructured entire Zustand stores (`const { isDrawerOpen, closeDrawer } = useUIStore()`, `const { user, logout } = useAuthStore()`). The `_layout.tsx` file (written in the same implementation) correctly used selectors (`useUIStore((s) => s.openDrawer)`), showing Antigravity knows the pattern but doesn't apply it consistently.
- **Root cause**: Antigravity defaults to object destructuring for Zustand stores, which is the simpler syntax. It used the selector syntax in one place where it was clearly modeled (the `GlobalHeader` one-liner) but fell back to destructuring in `SideMenu` where multiple values were needed.
- **Fix applied**: Replaced all Zustand store accesses in `SideMenu.tsx` with individual selectors: `useUIStore((s) => s.isDrawerOpen)`, `useUIStore((s) => s.closeDrawer)`, `useAuthStore((s) => s.user)`, `useAuthStore((s) => s.logout)`.
- **Rule to add**: "Always use Zustand selectors (`useStore((s) => s.field)`) instead of destructuring (`const { field } = useStore()`). Selectors prevent unnecessary re-renders when the store grows and are the recommended Zustand best practice. For actions that are stable references, either pattern is technically fine, but selectors should be the default."

### Pattern: Array Index as React Key (New)
- **What happened**: `renderItem` used `key={index}` for menu items, with an `idx + 10` offset hack for bottom items to prevent key collisions with primary items.
- **Root cause**: Antigravity defaults to using the array index parameter from `.map()` as the key without looking for a stable unique property on the data.
- **Fix applied**: Changed to `key={item.route}` — each menu item has a unique route string. Removed the `index` parameter from `renderItem` and the `idx + 10` offset hack.
- **Rule to add**: "Always use a stable, unique property from the data as the React `key` prop. Do not use array index (`key={index}`) unless the list is guaranteed to never be reordered, filtered, or have items inserted/removed. Common choices: `item.id`, `item.route`, `item.name`."

### Pattern: No Reduced Motion / Accessibility Handling for Animations (New)
- **What happened**: The drawer open/close animation and backdrop fade had no handling for users who have "Reduce Motion" enabled in their OS accessibility settings. The spring animation (`damping: 20, stiffness: 90`) could cause discomfort for users with vestibular disorders.
- **Root cause**: Antigravity implements the happy-path animation but doesn't check accessibility settings. The design-motion-principles skill mandates `prefers-reduced-motion` handling for every animation.
- **Fix applied**: Added `useReducedMotion()` hook from `react-native-reanimated` in `SideMenu.tsx`. When reduced motion is enabled, all animations use `withTiming(value, { duration: 0 })` (instant transition) instead of spring/timed animations.
- **Rule to add**: "Every animation must respect the user's accessibility settings. In React Native, use `useReducedMotion()` from `react-native-reanimated` (v4) or `AccessibilityInfo.isReduceMotionEnabled()` from React Native. When reduced motion is enabled, use instant transitions (duration: 0) or skip the animation entirely."

### Pattern: Handlers Not Wrapped in useCallback (New)
- **What happened**: `handleNavigate`, `handleLogout`, and `renderItem` in `SideMenu.tsx` were defined as plain functions inside the component body, recreated on every render. `renderItem` was already wrapped in `useCallback` but its dependency `handleNavigate` was unstable.
- **Root cause**: Antigravity defines handlers as arrow functions in the component body without memoizing them. This is the most common React pattern in tutorials but causes unstable references in components that use `useCallback` or `useMemo` downstream.
- **Fix applied**: Wrapped `handleNavigate` and `handleLogout` in `useCallback` with proper dependencies. `renderItem`'s dependency array now references the stable `handleNavigate` reference.
- **Rule to add**: "Wrap event handlers and callbacks in `useCallback` when they are (a) passed as props to child components, (b) used as dependencies in other `useCallback`/`useMemo` hooks, or (c) used in `useEffect` dependencies. This prevents cascading re-renders and stale closure bugs."

### Pattern: Inconsistent Code Patterns Within Same Implementation
- **What happened**: In the same commit, `_layout.tsx` used Zustand selectors correctly (`useUIStore((s) => s.openDrawer)`) while `SideMenu.tsx` used destructuring (`const { isDrawerOpen, closeDrawer } = useUIStore()`). Both files were part of the same implementation plan.
- **Root cause**: Antigravity appears to write each file in isolation without checking patterns used in sibling files from the same plan. The `_layout.tsx` file happened to use the correct pattern because the `openDrawer` call was a one-liner that fit naturally as a selector.
- **Fix applied**: Unified to selector pattern in `SideMenu.tsx`.
- **Rule to add**: "Before writing a new file, check the patterns used in other files that are part of the same implementation plan. Consistency within a single feature is as important as consistency with the broader codebase."

---

## [2026-05-28] Signup, Reset Password & Invite Registration Screens

### Pattern: Zustand Destructuring Without Selectors (3rd occurrence)
- **What happened**: `_layout.tsx` destructured `{ isAuthenticated, isLoading, user, hydrate }` from `useAuthStore()`. This is the third occurrence of this pattern across three different Antigravity implementations (SideMenu, then a previous _layout, now this _layout). The fix applied in the SideMenu cycle was documented with a rule, but the pattern recurred because modifying existing files (_layout.tsx) bypassed the newly learned rule which was only applied to new files.
- **Root cause**: Antigravity treats existing files that it modifies as "already correct" and only applies new patterns to newly created files. When modifying a pre-existing file for routing changes, it left the existing (incorrect) destructuring pattern intact.
- **Fix applied**: Replaced destructuring with individual selectors and `useAuthStore.getState().hydrate()` for the one-time hydration.
- **Rule to add**: "When modifying an existing file, audit the ENTIRE file for pattern compliance (Zustand selectors, accessibility labels, useCallback, module-level imports), not just the lines being changed. A modification to one section is an opportunity to bring the whole file up to standard."

### Pattern: New Files Get Accessibility, Modified Files Don't (New)
- **What happened**: All newly created forms (signup-form.tsx, reset-password-form.tsx, invite/[token].tsx) had proper `accessibilityRole` and `accessibilityLabel` on interactive elements. But login-form.tsx, which was modified in the same implementation to add navigation links, did NOT get accessibility labels on its password toggle or forgot-password link — elements that existed before the modification.
- **Root cause**: Antigravity applies accessibility rules when creating new components but doesn't retroactively add them to existing components being modified, even when touching the same interactive elements.
- **Fix applied**: Added `accessibilityRole="button"` and `accessibilityLabel` to password toggle and forgot-password link in login-form.tsx.
- **Rule to add**: Same rule as above — "When modifying a file, audit it for missing accessibility attributes."
