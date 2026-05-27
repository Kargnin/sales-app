# Daily Handover & Engineering Audit Report

This report has been compiled for the next agent/developer to review the current engineering state of the Multi-tenant Sales & Order Management SaaS, identify structural/logical gaps, highlight security/redundancy issues, and detail the exact integration/E2E test scenarios that need to be implemented.

---

## 1. TypeScript & Compilation Verification
We have executed complete type checking and builds across all workspaces in the monorepo.
- **Shared Package (`packages/shared`)**: Compiles perfectly with no type errors. Types are resolved directly by consumer workspaces via typescript base configuration.
- **Backend Server (`server`)**: Compiled successfully using `tsc`. Zero compiler errors or warnings.
- **Frontend Client (`client`)**: Compiled successfully using `tsc -b && vite build`. Zero compiler errors or warnings.
  - *Rollup optimization tip*: Chunks larger than 500kB were generated during minification. It is recommended to use dynamic `import()` code-splitting or configure `build.rollupOptions.output.manualChunks` in [vite.config.ts](file:///Users/bhushanmalani/Code/Sales%20App/client/vite.config.ts).

---

## 2. General Test Coverage Metrics
The current test suites are exceptionally healthy, with **153 tests passing successfully** across the monorepo:

### A. Shared Package (`@sales-app/shared`) — 25/25 Tests Passing
- Verifies comprehensive Zod schema validations for `auth`, `orders`, `payments`, `shops`, and `visits` modules.

### B. Client Application (`@sales-app/client`) — 39/39 Tests Passing
- **`App.test.tsx`** (2 tests): Basic mounting and router integration.
- **`NotificationsPage.test.tsx`** (4 tests): Renders, marks read, and deletes notifications with proper React hooks.
- **`SalesmanDashboard.test.tsx`**: Validates mobile salesman views, check-in button rules, and order placing drawers.
- **`SidebarLayout.test.tsx`** (13 tests): Asserts role-based layout rendering (Admin vs. Salesman side panels), path-based highlights, and cross-route redirection rules.
- **`notificationStore.test.ts`**: Tests state updates, unread notification counts, and real-time event updates in the Zustand store.
- **`offline.test.tsx`**: Validates sequential synchronization queuing, optimistic additions for shops/orders/visits, offline state toggling, auto-resolution of temporary IDs (e.g., placing an order on an optimistically created shop), permanent failure (400 validation) skipping, and cascading queue deletion.

### C. Backend Server (`@sales-app/server`) — 89/89 Tests Passing
- **`health.test.ts`** (1 test): Standard ping integration.
- **`gps.test.ts`** (6 tests): Haversine distance accuracy checks and tolerance boundaries.
- **`auth.test.ts`** (11 tests): Scopes multi-tenant registration, login credentials, and initial profile queries.
- **`deactivation.test.ts`** (4 tests): Blocks admin self-deactivation and ensures deactivated salesman sessions/refresh tokens are instantly rejected.
- **`notifications.e2e.test.ts`** (17 tests): Scopes and emits correct alerts for shop status changes, order approvals, and check-ins.
- **`shops-visits.test.ts`** (16 tests): Validates salesman pending shop creations, admin approvals/rejections, distance tolerance-based visits, and hard block cascades (canceling shop orders on rejection).
- **`orders-payments.test.ts`** (34 tests): Tests total amounts, cancellation windows (15 min limits, status-based cancellations), payment recording, partial payments, and multi-tenant scoped lookups.

---

## 3. Critical Untested Scenarios & Missing Test Handover
While the test suites are extensive, we identified **two major critical modules that are completely untested**. The next agent must write integration tests for these immediately.

### Scenario A: Salesman Self-Onboarding via Invites
The invitation-based registration endpoints in [auth.routes.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/routes/auth.routes.ts#L196-L303) and [users.routes.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/routes/users.routes.ts#L262-L280) are **untested**. There are no tests verifying this public workflow.

**Required Tests to Write:**
1. **Invite Token Generation**: Verify that `POST /api/users/generate-invite` (restricted to Admins only) successfully generates a valid, JWT-signed invite token scoping the current `tenantId` and containing `{ role: 'salesman', action: 'invite' }` expiring in 7 days.
2. **Invite Token Verification**: Verify that public `POST /auth/verify-invite` returns the correct `tenantId` and `tenantName` for a valid token, and returns `400` for tampered, expired, or non-invite tokens.
3. **Register Salesman via Invite**: Verify that public `POST /auth/register-salesman` successfully creates a new active user under the matching tenant, hashes the password, and returns access/refresh tokens.
4. **Duplicate Username Block**: Verify that registering an invited salesman fails if the chosen `username` is already taken globally.
5. **Password Complexity Validation**: Verify that invite registration fails if the chosen password is shorter than 8 characters.

---

### Scenario B: Database Audit Log Triggers
The database triggers configured in [setupTriggers.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/db/setupTriggers.ts) to populate the `audit_logs` table are **completely untested**.

**Required Tests to Write:**
1. **Shop Update Audit**: Verify that updating a shop's `status`, `name`, or `phone` triggers an auto-insertion of an `UPDATE` log in the `audit_logs` table with correct JSON representation of `oldData` and `newData`.
2. **Order Update Audit**: Verify that transitioning an order's status (e.g. from `confirmed` to `dispatched`) or payment status automatically records the audit entry containing status details.
3. **User Update Audit**: Verify that deactivating a user or modifying their role inserts a record with their credentials.
4. **No-op Suppressions**: Verify that database updates that do NOT change auditable columns (e.g., updating a user's phone or email) do **NOT** insert any records into the `audit_logs` table.

---

## 4. Key Bottlenecks, Vulnerabilities & Gaps

### 🚨 Logical Gap: Static & Unused Product Stock (`stockQuantity`)
- **Issue**: The `products` schema defines `stockQuantity: int` and the seeder initializes products with stock levels (e.g., 200, 500). However, the order placement endpoint `POST /api/orders` in [orders.routes.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/routes/orders.routes.ts#L445) does **NOT** check if the order quantity exceeds available stock, nor does it decrement/increment stock on order placement or cancellation.
- **Impact**: Salesmen can place orders for infinite quantities of soaps, resulting in complete inventory tracking breakdown.
- **Remediation**: Add inventory validation in `POST /api/orders` to fail orders exceeding stock levels, and use database transactions to deduct/restore stock during order placement and cancellations.

### 🚨 Redundant Configuration / Outdated Information in Documentation
- **Issue in `DESIGN.md` vs `index.css`**: 
  - `DESIGN.md` states in line 8: "*Field Salesman: ... Android phone ... Business Admin: ... laptop ...*". It bans glassmorphism and decorative animation (transitions limited to 120-180ms).
  - However, in [index.css](file:///Users/bhushanmalani/Code/Sales%20App/client/src/index.css#L765), there is a Tailwind configuration block:
    ```css
    :root {
      --background: oklch(1 0 0);
      --foreground: oklch(0.145 0 0);
      /* ... multiple standard shadcn root variables ... */
    }
    ```
    This completely conflicts with the custom design system OKLCH neutral scale (such as `--neutral-950` as dark mode background, and `--bg-page` mapping to `--neutral-950`).
  - **Why it's outdated**: The project is using two conflicting styling approaches simultaneously: custom semantic classes like `.auth-card` in [index.css](file:///Users/bhushanmalani/Code/Sales%20App/client/src/index.css#L251) and standard `@tailwind` variables. In the future, the design spec needs to be updated to clarify whether Tailwind/Shadcn should govern the theme or custom vanilla CSS variables should take precedence.

### 🚨 Performance Bottleneck: Scoped Catalog Queries
- **Issue**: In `POST /api/orders`, the server loads the entire scoped product catalog to perform price calculation and matching:
  `const dbProducts = await db.select().from(products).where(eq(products.tenantId, tenantId));`
- **Impact**: When the catalog grows to thousands of SKUs, querying the entire database catalog on every order placement transaction is slow and introduces severe performance degradation (O(N) search in memory).
- **Remediation**: Query only the products matching the ordered items' IDs in a single SQL `IN` query.

---

## 5. Architectural Redesign & Refactoring Scope

### A. Standardize Multi-Tenancy Scoping in Drizzle
- **Current Approach**: Scoping is handled manually in every route using explicit SQL clauses (e.g. `and(eq(orders.id, id), eq(orders.tenantId, tenantId))`).
- **Redesign Proposal**: Introduce a custom Drizzle plugin or a scoped database helper function that wraps the client context. This prevents developer oversights that could lead to data leaks between soap manufacturers (tenants).

### B. Decouple Notification Broadcasts via an Event Bus or Queue
- **Current Approach**: When a shop or order is modified, database transactions block while writing to the `notifications` table synchronously.
- **Redesign Proposal**: Implement an asynchronous event emitter or a background worker queue (e.g., Redis-backed queue since `redis` is already in `dependencies` of `server/package.json`). When an order is placed, emit an event `'order.created'`, and let a separate consumer process construct and push notifications. This speeds up critical sales API response times under low mobile bandwidth.

---

### Verification and Delivery Completed
*Both TypeScript compilation and the 153 integration tests build successfully.* No code modifications have been made, maintaining strict stability and compliance with all user-defined constraints.
