# Plan Review — Stitch-Style Admin Dashboard & Login UI Redesign

## Verdict: CHANGES REQUESTED

## Strengths
- Good separation of concerns: backend metrics endpoint is independent from frontend visual redesign, allowing either to be iterated independently
- Reuses existing infrastructure (`apiClient`, TanStack Query, `useVisits` hook pattern) rather than introducing new data-fetching patterns
- Plan correctly identifies the need to update the shared `loginSchema` and auth error messages when switching to email-or-username login
- Design tokens reference the existing Stitch "Warm Tactile Industrial" system, maintaining consistency with the rest of the app

## Issues to Address

### 1. CRITICAL: Missing Auth Middleware on Dashboard Route
- **Location**: `server/src/routes/dashboard.routes.ts` (new)
- **Problem**: The plan doesn't mention applying `authenticate` and `tenantScope` middleware to the new dashboard routes. Every other route file (`visits.routes.ts:14`, `shops.routes.ts`, `orders.routes.ts`) uses `router.use(authenticate, tenantScope)`. Without this, the metrics endpoint would be publicly accessible.
- **Suggestion**: Add `router.use(authenticate, tenantScope)` at the top of the dashboard router, matching the pattern in `visits.routes.ts:14`.

### 2. CRITICAL: Missing Role-Based Scoping for Metrics
- **Location**: `server/src/routes/dashboard.routes.ts` (new) — `GET /metrics`
- **Problem**: The plan says "scoped to the logged-in user's tenantId" but doesn't address role-based scoping. An admin should see all tenant data; a salesman should only see their own orders/visits. The existing `visits.routes.ts:28-30` demonstrates this pattern: admins get full tenant scope, salesmen get filtered to their own `salesmanId`.
- **Suggestion**: After `tenantScope` middleware sets `req.user.tenantId`, check `req.user.role`. For salesmen, filter revenue/visits by `salesmanId = req.user.sub`. For admins, aggregate across the full tenant.

### 3. CRITICAL: Shared Type Missing `pendingApprovals` Field
- **Location**: `client/src/types/index.ts` — `DashboardMetrics` interface (line 76-84)
- **Problem**: The plan introduces a "Pending Approvals" metric card but `DashboardMetrics` has no `pendingApprovals` field. The backend endpoint needs to return it, and the type needs to include it.
- **Suggestion**: Add `pendingApprovals: number` to the `DashboardMetrics` interface. The backend computes it via `count of shops where status = 'pending_approval'`.

### 4. CRITICAL: Login Schema Validation Message is Misleading
- **Location**: `packages/shared/src/schemas/auth.schemas.ts:15` — `loginSchema`
- **Problem**: The current schema validates a `username` field with message "Username is required." If the backend now accepts either username or email in that field, the validation message is misleading when the user enters an email. The plan mentions updating the backend but not the shared schema.
- **Suggestion**: Update the field to accept either, and change the validation message to "Username or email is required." Also update the auth route error message from "Invalid username or password" to "Invalid credentials."

### 5. CRITICAL: `useVisits` Hook Referenced But Doesn't Exist
- **Location**: `client/src/features/dashboard/recent-visits-list.tsx` (new)
- **Problem**: The plan says to use the `useVisits` hook, but `client/src/hooks/useVisits.ts` doesn't exist. The plan should either create this hook or fetch visits inline.
- **Suggestion**: Create `client/src/hooks/queries/useVisits.ts` using TanStack Query `useQuery` to call `GET /api/visits` via `apiClient`, following the same pattern as `useDashboardMetrics.ts`.

### 6. MODERATE: External Image URLs Are a Reliability Risk
- **Location**: `client/app/(admin)/dashboard.tsx` and `client/src/features/auth/login-form.tsx`
- **Problem**: The mascot illustrations are loaded from `lh3.googleusercontent.com/aida-public/...` URLs. These are external, long, unversioned URLs that could break or be slow to load. If the URL breaks, both the login page and dashboard header will show a broken image.
- **Suggestion**: Download these images to `client/assets/images/` and reference them locally. If keeping remote URLs, add a fallback placeholder (initials circle) for when the image fails to load.

### 7. MODERATE: Static Greeting Text
- **Location**: `client/app/(admin)/dashboard.tsx` — header
- **Problem**: "Good morning, Partner" is hardcoded. At 3 PM this reads as incorrect.
- **Suggestion**: Derive the greeting from the current hour: "Good morning" (5-11), "Good afternoon" (12-17), "Good evening" (18-4). A simple `useMemo` with `new Date().getHours()` suffices.

### 8. MODERATE: Missing Error/Empty/Loading States in New Components
- **Location**: `client/src/features/dashboard/recent-visits-list.tsx` (new) and `client/src/features/dashboard/metrics-grid.tsx` (modified)
- **Problem**: The plan describes the happy path (data loaded, cards rendered) but doesn't address:
  - What renders while metrics are loading
  - What renders when the API errors out
  - What the recent visits list shows when there are zero visits
- **Suggestion**: Use TanStack Query's `isLoading` state to render skeleton placeholders. Add an empty state component for when the visits array is empty. The `MetricsGrid` currently returns `null` when data is undefined — consider a loading skeleton instead.

### 9. MODERATE: "Forgot Password" Implementation is Vague
- **Location**: `client/src/features/auth/login-form.tsx`
- **Problem**: The plan says "wire it up to display a beautiful custom React Native alert with password recovery instructions (and/or provide a basic screen flow if needed)." "Custom React Native alert" is ambiguous — likely means `Alert.alert()` from React Native, but that can't render styled content.
- **Suggestion**: Commit to one approach: either use React Native's `Alert.alert()` for a simple message ("Contact your admin to reset your password"), or build a proper `ForgotPasswordScreen` with an email input and API endpoint. The plan should decide before implementation.

### 10. LOW: Plan-Task Misalignment on Card Styling
- **Location**: `task.md` vs `implementation_plan.md`
- **Problem**: The task checklist mentions "borderless transparent overview stat cards" and "flat borderless recent visits timeline" but the plan describes cards with "bg-white, 1px border (#f2f0ed), 10px rounded corners." These are contradictory — borderless vs bordered. The implementing agent won't know which to follow.
- **Suggestion**: Reconcile these. If the Stitch designs show bordered cards, update the task checklist. If they're borderless, update the plan.

### 11. LOW: No Test Plan for New Backend Endpoint
- **Location**: Verification Plan section
- **Problem**: The verification only lists `npx tsc --noEmit` checks. A new backend endpoint with business logic (metrics computation) and redesigned auth flow (email-or-username login) should have tests. The project already has test infrastructure (`packages/shared/src/__tests__/schemas.test.ts`).
- **Suggestion**: Add at minimum: (1) a test for the login endpoint accepting email in the username field, (2) a test for the dashboard metrics endpoint returning correctly scoped data per role.

## Optional Improvements
- **Time-formatting for visits**: The plan mentions "10:45 AM" format. Consider using `Intl.DateTimeFormat` for locale-aware time formatting rather than hardcoding a 12-hour format.
- **The FAB "New Product" action**: Consider whether this should navigate to product creation or open a quick-action menu. The dashboard FAB is prime real estate and a single action may underuse it.
- **Font loading**: The Fraunces font for "Welcome back" needs to be loaded in the Expo project. Consider using `expo-font` with `useFonts` hook, and note that serif fonts increase bundle size.
- **Password visibility toggle**: The plan mentions adding a visibility toggle to the password input. Confirm that the existing `Input` component supports a `rightIcon` or `secureTextEntry` toggle prop — if not, the Input component may need extending too.
