# Stitch-Style Admin Dashboard & Login UI Redesign (Revised)

This plan outlines the redesign of the **Admin Dashboard** and **Login Page** in the React Native / Expo client to match the exact Stitch designs, and integrates a secure, role-adaptive metrics API in the Express / Drizzle backend to serve real business overview data.

## User Review Required

> [!IMPORTANT]
> **Email or Username Login Support**: In the Stitch login mockup, the input field placeholder is `Email address`. We will update the server-side `/auth/login` endpoint to accept **either** email or username in that field. The shared zod `loginSchema` will be updated to say "Username or email is required" and the API error will be generic ("Invalid credentials") for security.
>
> **Forgot Password Flow**: We will style the `Forgot Password?` link exactly as in the mockup, and wire it up to display a native React Native `Alert.alert("Reset Password", "Please contact your system administrator to reset your password.")`.
>
> **Asset Localization**: We will download the two mascot illustrations from Stitch to `client/assets/` locally, eliminating external network dependencies and ensuring instant load times.

---

## Proposed Changes

### Backend Components

We will implement a secure, role-adaptive backend endpoint `GET /api/dashboard/metrics` that queries Drizzle ORM to compute actual live metrics, and update shared schemas and auth routes to allow logging in with either username or email.

#### [NEW] [dashboard.routes.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/routes/dashboard.routes.ts)
- Implement `GET /metrics` route.
- **Security**: Apply global middleware `authenticate` and `tenantScope` so it is locked to authenticated users of a specific tenant.
- **Role-Adaptive Scoping**:
  - Check `req.user.role`.
  - For `salesman`, restrict the counts/sums to their own `salesmanId = req.user.sub` (e.g. Total Sales revenue from their orders, Total Visits from their visits, and `activeSalesmen` = 1, `pendingApprovals` = 0).
  - For `admin`, fetch aggregate totals across the full `tenantId` (e.g. Total Sales of all orders, total active salesmen, total pending shops, total visits).
- Compute:
  1. `totalRevenue`: Sum of `totalAmount` of all confirmed/completed/delivered orders.
  2. `activeSalesmen`: Count of active users with `role = 'salesman'`.
  3. `pendingApprovals`: Count of shops with `status = 'pending_approval'`.
  4. `totalVisits`: Count of all check-in visits.
  5. `revenueChange` / `ordersChange` / `visitsChange`: Dynamic comparisons (or hardcoded percentage constants matching Stitch).

#### [MODIFY] [index.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/index.ts)
- Import and register `/api/dashboard` routes.

#### [MODIFY] [auth.routes.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/routes/auth.routes.ts)
- Update login endpoint to support finding a user by username **or** email address:
  `where: username.includes('@') ? eq(users.email, username) : eq(users.username, username)`
- Align error messages to "Invalid credentials."

#### [MODIFY] [auth.schemas.ts](file:///Users/bhushanmalani/Code/Sales%20App/packages/shared/src/schemas/auth.schemas.ts)
- Update `loginSchema` validation:
  ```typescript
  export const loginSchema = z.object({
    username: z.string().min(1, { message: 'Username or email is required' }),
    password: z.string().min(1, { message: 'Password is required' }),
  });
  ```

---

### Frontend Components

We will completely rebuild the Admin Dashboard and Login layout to match the typography, spacing, border styles, mascot illustrations, and floating elements of the Stitch designs.

#### [MODIFY] [index.ts](file:///Users/bhushanmalani/Code/Sales%20App/client/src/types/index.ts)
- Update `DashboardMetrics` interface to include `pendingApprovals: number` field.

#### [MODIFY] [useDashboardMetrics.ts](file:///Users/bhushanmalani/Code/Sales%20App/client/src/hooks/queries/useDashboardMetrics.ts)
- Update query function to fetch from `/api/dashboard/metrics` using the `apiClient`.

#### [MODIFY] [metrics-grid.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/src/features/dashboard/metrics-grid.tsx)
- Re-style the Overview/Stats Grid as a beautiful 2x2 wrapping grid.
- Style cards with `bg-white`, a 1px border (`#f2f0ed`), 10px rounded corners, and proper icon badges matching Stitch.
- **Robust States**: 
  - Render a matching 2x2 grid of custom shaded Skeleton Cards when `isLoading` is true.
  - Render a clean error state text when the API errors out.

#### [NEW] [recent-visits-list.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/src/features/dashboard/recent-visits-list.tsx)
- Replaces the generic recent orders list with "Recent Visits" showing real check-in activity using the existing `useVisits` hook.
- Implement list items matching Stitch design:
  - Initials circle avatar (`JD`, `AS`, `RJ`) with `#eeeeed` background.
  - Salesman Name + Shop Name with a subtle storefront icon.
  - Status text ("Completed" or "In Progress" colored appropriately).
  - Time text formatted via standard locale-aware `Intl.DateTimeFormat` (or a helper).
  - "Recent Visits" header row with a "View All" action button.
- **Robust States**:
  - Render simple list skeletons when `isLoading` is true.
  - Render a beautiful custom empty state message ("No recent visits recorded today") when the visits list is empty.

#### [MODIFY] [dashboard.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/app/(admin)/dashboard.tsx)
- Replace generic "Dashboard" text with a Stitch-perfect Header Row:
  - Localized mascot illustration (`assets/mascot_partner.png`) in a rounded circle with standard fallback.
  - Dynamic Greeting derived from the current hour using `new Date().getHours()`:
    - `Good morning, Partner` (5:00 - 11:59)
    - `Good afternoon, Partner` (12:00 - 17:59)
    - `Good evening, Partner` (18:00 - 4:59)
  - Far-right Notification Bell button with rounded border.
- Integrate the newly designed `MetricsGrid` and `RecentVisitsList`.
- Render the Floating Action Button (FAB) pill shape at the bottom-right: `bg-primary` (black/charcoal), containing a white `+` icon and text `New Product` with a rich drop shadow.

#### [MODIFY] [login-form.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/src/features/auth/login-form.tsx)
- Rebuild inputs to have custom envelope (`mail`) and lock (`lock`) inline icons on the left, comfortable padding, and NO label above them.
- Add password visibility toggle on the right of the password input.
- Insert the beautiful circular local mascot image (`assets/mascot_welcome.png`) with white borders, shadow, and an absolute-positioned heart button in red/orange overlay at the bottom right.
- Add the `Forgot Password?` link styled in Ember Orange `#ff3e00` aligned on the right.
- Change header to serif "Welcome back" (using Fraunces font).
- Re-style footer link `Don't have an account? Create an account` with the proper underlined styles.

---

## Verification Plan

### Automated Tests
- Run TS checks on both client and server:
  - `cd client && npx tsc --noEmit`
  - `cd server && npm run build`
- Add Integration Tests:
  - **Auth**: A test inside `server/src/__tests__/auth.test.ts` verifying login with email in the `username` field.
  - **Dashboard**: A new test suite `server/src/__tests__/dashboard.test.ts` verifying that `GET /api/dashboard/metrics` returns role-scoped numbers (admin sees all user aggregates, salesman sees only their own data).

### Manual Verification
- Deploy and preview the screens in the Expo web/native runner:
  - Ensure the Login screen displays the mascot header, inputs have matching icons, forgot password link is present, and password eye toggles.
  - Verify that the Dashboard loads stats dynamically from the backend, renders the mascot header, shows recent visits with initials avatars, and has the floating `+ New Product` pill.
