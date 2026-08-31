# GOTCHAS.md — Known Pitfalls & Audit Findings

> **MANDATORY READING for any agent (or human) doing feature work in this repo.**
> Read this file BEFORE writing or changing code. It records verified mistakes,
> security issues, and design violations found by audits — so they are never repeated.
> When you fix an issue listed here, mark it `[FIXED]` with the commit/PR reference —
> do not delete the entry (history matters), strike it through or annotate it.

## How to use

- **Before feature work:** scan the relevant section (Security / Server / Client / Frontend / Architecture / Testing) for gotchas that touch your area.
- **Adding entries:** append findings from code reviews, audits, or your own debugging. One entry per issue, follow the format below.
- **Format:**

```md
### [SEV-1] Concise gotcha-style title ("Don't …", or "<thing> is wrong because …")

- **Area:** Security | Server | Client | Frontend | Architecture | Testing
- **File:** path:line (where the problem lives)
- **Issue:** concrete description of the problem
- **Best practice violated:** name the standard/practice
- **Fix:** actionable recommendation
- **Status:** Open | FIXED (<commit/PR>)
```

Severity: **SEV-1** = must fix (vulnerability / correctness / data-loss), **SEV-2** = should fix (real risk, tech debt with teeth), **SEV-3** = nice-to-have (hardening, style).

> 📚 For the _positive_ side — verified, version-specific best practices with official
> doc URLs (react-query v5, zustand v5, reanimated 4, drizzle, Express 5, etc.) — see
> **`BEST_PRACTICES.md`** in the repo root. Read both before feature work.

---

## Security

### [SEV-1] Don't rely on logout to end sessions — there is no server-side logout, and `/auth/refresh` ignores `tokenVersion`, so stolen refresh tokens stay valid for 7 days **[FIXED: 405a9ee]**

- **File:** `server/src/routes/auth.routes.ts:150-183` (/auth/refresh), `client/src/stores/authStore.ts:98-107` (logout)
- **Issue:** `logout` only deletes client tokens (grep: zero `logout` matches in `server/src`). `tokenVersion` is bumped on password change (users.routes.ts:82) and deactivation (users.routes.ts:225), and `authenticate.ts:39` enforces it for **access** tokens — but `/auth/refresh` never compares `decoded.tokenVersion` to the DB value, so any previously issued refresh token (7d expiry) keeps minting new access tokens after logout/password change. Stolen refresh tokens are unrevocable.
- **Best practice violated:** OWASP Session Management — logout must invalidate server-side state; refresh tokens must be revocable.
- **Fix:** Add `POST /auth/logout` that bumps `tokenVersion` (or Redis jti denylist); in `/auth/refresh`, reject when `decoded.tokenVersion !== user.tokenVersion`; consider refresh-token rotation with jti family tracking.

### [SEV-1] Don't return `cancellationToken` from order APIs — it's the customer's unauthenticated cancel secret, and every user with order visibility can now cancel any order via `POST /public/cancel` **[FIXED: 86d9028]** _(hash-at-rest + response exclusion done; signed customer link hardening still open)_

- **File:** `server/src/routes/orders.routes.ts:207, 282, 338, 503, 623` (returned in list/detail/payment/status), `orders.routes.ts:73-149` (cancel by token, no auth)
- **Issue:** The public cancel portal authenticates by token only. Since every authenticated order response includes `cancellationToken` in plaintext, exploit chain is: `GET /api/orders` → token → `POST /public/cancel` — bypassing admin approval entirely.
- **Best practice violated:** Broken access control (OWASP A01); capability tokens must not be returned to principals not entitled to the capability; secrets hashed at rest.
- **Fix:** Exclude `cancellationToken`/`cancellationWindowExpiresAt` from all order responses; store SHA-256 hash of the token; gate cancellation behind a signed customer link; make the endpoint idempotent + audit-logged.

### [SEV-1] Don't ship the `DBG-VALIDATE` body logger in `validate.ts` — it prints plaintext passwords (login/register) to the server console **[FIXED: 2e9fb31]**

- **File:** `server/src/middleware/validate.ts:8-11` (⚠️ currently an **uncommitted working-tree change** — do NOT commit as-is)
- **Issue:** On every failed validation the middleware logs `body=${JSON.stringify(req.body).slice(0,300)}`. Applied to `POST /auth/login` and `/auth/register`, so failed attempts log usernames **and passwords** in plaintext.
- **Best practice violated:** CWE-532 (sensitive info in logs); OWASP logging cheat sheet.
- **Fix:** Delete lines 8-11. If debug logging is needed, log method/path/status and redacted error paths only — never the body.

### [SEV-2] Don't trust client-supplied GPS coordinates for `gpsVerified` — the check-in anti-fraud control is trivially spoofed

- **File:** `server/src/routes/visits.routes.ts:131-137`, `server/src/utils/gps.ts:30-35`
- **Issue:** `gpsVerified` is computed server-side from lat/lng that the **client sends in the request body** (numbers only). A salesman can send the shop's own coordinates and every check-in is "GPS-verified".
- **Best practice violated:** CWE-345/346 — insufficient verification of data origin; location attestation integrity.
- **Fix:** Treat coordinates as client-asserted (`gpsClaimed` + risk score), require a timestamped photo, or use attestation/beacon. At minimum document that `gpsVerified` is client-asserted and never make it a hard control.

### [SEV-2] Don't stay on `drizzle-orm@0.44.x` — prod audit flags HIGH SQL-injection advisory (GHSA-gpj5-g38j-94v9, fixed in 0.45.2)

- **File:** `server/package.json:25`
- **Issue:** `drizzle-orm <0.45.2` = "SQL injection via improperly escaped SQL identifiers". The app uses `sql\`…\`` templates (products.routes.ts:40, orders.routes.ts:183/192-193, dashboard.routes.ts:27) — today's interpolations are schema constants (low exploitability), but every future dynamic identifier inherits the advisory.
- **Best practice violated:** Dependency vulnerability management; parameterized queries only.
- **Fix:** Upgrade to ≥0.45.2 (`--force`-flagged breaking — re-verify all `sql` template call sites + tests). Also triage `brace-expansion` (high, DoS) and `ip-address` (high, transitive).

### [SEV-2] Don't run auth endpoints behind a reverse proxy without `trust proxy`, and don't allow 100 login attempts/15min

- **File:** `server/src/index.ts:20-27` (no `app.set('trust proxy')`), `server/src/routes/auth.routes.ts:14-20` (authLimiter max **100**/15min shared by login/register/refresh/invite/reset)
- **Issue:** Behind nginx/ALB every user shares one `req.ip` bucket (one attacker exhausts it → DoS all logins). 100/15min per IP is far above OWASP's 5–10 for credential stuffing, and there's no per-account lockout.
- **Best practice violated:** OWASP rate limiting / credential-stuffing protection; correct client-IP resolution.
- **Fix:** `app.set('trust proxy', 1)` (or correct hop count); tighten login to ~5–10/15min per IP + per-username exponential backoff; separate looser limiters for register/refresh.

### [SEV-2] Don't keep client-side authorization role-blind — the `(salesman)` route group is empty, so salesmen are redirected into a dead end **[FIXED: b7ba058]**

- **File:** `client/app/_layout.tsx:28-32`, `client/app/(admin)/_layout.tsx` (no role check), `client/app/(salesman)/` (**zero files**)
- **Issue:** Root `AuthRedirect` only checks authenticated-vs-auth, never role; any salesman can deep-link into `/(admin)/…` (server 403s the API calls, but admin UI renders + errors). Worse: `_layout.tsx:31` routes salesmen to `/(salesman)/visits` which **doesn't exist** → salesmen hit `+not-found` and cannot use the app at all.
- **Best practice violated:** OWASP A01 — role-based access control at every layer (defense in depth).
- **Fix:** Build the `(salesman)` group; add a role check in AuthRedirect and a `role !== 'admin'` guard in `(admin)/_layout.tsx` that redirects to salesman home.

### [SEV-2] Don't reuse invite tokens or skip validation on `register-salesman`

- **File:** `server/src/routes/auth.routes.ts:220-293` (no zod — manual checks only), `auth.routes.ts:186-217` (verify-invite), `users.routes.ts:250-265` (7d token, no usage tracking)
- **Issue:** Invite JWTs are single-purpose but **not single-use** — a leaked/forwarded invite mints unlimited salesman accounts until expiry. Password policy is only "length ≥ 8".
- **Best practice violated:** OWASP — one-time tokens must be invalidated on first use; consistent input validation.
- **Fix:** Track invite jti/consumption (Redis set or `consumed_at` column); apply a shared `inviteAcceptSchema` via `validate()`; enforce a shared password policy.

### [SEV-2] Don't leak username existence on registration endpoints

- **File:** `server/src/routes/auth.routes.ts:39-41, 244-247`, `users.routes.ts:128-131`
- **Issue:** Distinct "Username is already taken" errors on register/register-salesman/POST users = account enumeration (login correctly returns generic "Invalid credentials").
- **Best practice violated:** OWASP enumeration resistance; uniform error messages.
- **Fix:** Same 400/409 message whether the username exists or not; consider case-insensitive uniqueness (MySQL unique is case-sensitive).

### [SEV-3] Harden batch (Security)

- **File:** see each item
- 1. `jwt.verify` without `algorithms` whitelist — `authenticate.ts:27`, `auth.routes.ts:158, 194, 228`; pin `{ algorithms: ['HS256'] }` and validate `decoded.sub`/`tenantId` are strings.
- 2. Writes keyed by `id` only after a tenant-scoped existence check — `shops.routes.ts:151, 231, 317`, `products.routes.ts:164`, `orders.routes.ts:501, 557, 596`. Not exploitable today, one refactor away from cross-tenant write. Scope writes with `and(eq(id), eq(tenantId))`.
- 3. Cross-tenant boolean oracle — `products.routes.ts:190` checks `orderItems` by `productId` with no tenant filter before delete; scope it.
- 4. `imageUrl` unvalidated — `packages/shared/src/schemas/shop.schemas.ts:41` (no `.url()`, no `.max()`; DB column varchar(500) → >500 chars = 500 error). Add `.url().max(500)` like product.schemas.ts:33 / visit.schemas.ts:7. **No server upload endpoint exists** (verified: no multer/busboy) — plan content-type/size validation when adding one.
- 5. Unbounded order quantities — `order.schemas.ts:5` (`z.number().int().positive()` no max; items unbounded) — `price×quantity` can overflow `DECIMAL(12,2)` → 500s. Cap quantity (≤99999) and items (≤50).
- 6. No minimum JWT-secret strength check — `server/src/config.ts:13-14` accepts `JWT_SECRET=secret`; assert length ≥ 32 at boot.
- 7. MySQL pool without SSL (`db/connection.ts:7-18`) and Redis without auth (`rateLimiter.ts:17`, REDIS_URL only) — use rediss:// + requireAuth for remote deployments.
- 8. CORS `'*'` with credentials (`index.ts:21-24`) — token-in-header mitigates; set explicit origin list for web builds.
- 9. Plain-HTTP API by default — `client/src/lib/constants.ts:1` (`http://localhost:3001`), `client/.env` (`http://192.168.31.94:3001`). Release Android blocks cleartext → **prod must be HTTPS or the app breaks**.
- 10. Unused `RECORD_AUDIO` permission — `client/app.json:22`; also review `android:allowBackup="true"`.
- 11. Mock `/auth/reset-password` logs the submitted email (`auth.routes.ts:302`) and there's no real reset flow — build one with expiry + token invalidation before launch.
- 12. Seed credentials are public — `server/src/db/seed.ts:33, 47` (`admin123`/`sales123`); never run `db:seed` against prod-like DBs.
- 13. Client-controlled `x-request-id` echoed unvalidated (`requestId.ts:13`; log-forging) — validate `^[A-Za-z0-9-]{1,64}$`; don't put tokens in query strings (`requestLogger.ts:12` logs `originalUrl`).
- 14. Zod error details returned to clients (`validate.ts:14` `result.error.format()`) — trim to field-level messages.
- 15. `audit_logs` has no `tenant_id` (`db/schema.ts:200-208`) — add the column now or future audit endpoints can't be tenant-scoped.
- 16. Client dep audit: 14 vulns (11 moderate, 3 high) in the Expo SDK build chain (`@expo/cli`, `@expo/config`, metro, postcss) — not runtime, but track `expo` SDK updates.
- 17. Web target stores tokens in `localStorage` (`client/src/lib/storage.ts:8, 16`) — fine on native (SecureStore); if web ever ships, use httpOnly cookies. (Web is not a target — see Client SEV-3.)

---

## Server

### [SEV-1] Payment recording has a lost-update race — two concurrent payments can overpay an order **[OPEN — deferred until the order flow ships (user decision: order logic is not yet implemented)]**

- **File:** `server/src/routes/orders.routes.ts:464-504` (same at :534-560 for mark-paid)
- **Issue:** `existingPayments` is read _before_ the transaction; the transaction never locks the order row. Two concurrent `POST /:id/payments` both read `remaining = 100`, both insert ₹100 → order overpaid 2× while `paymentStatus` says `paid`. The suite already tests the cancellation race (orders-payments.test.ts:543-567) but not this one.
- **Best practice violated:** Money mutations must be serialized (row lock / atomic conditional update).
- **Fix:** Inside the transaction `SELECT … FOR UPDATE` the order row (or atomic `UPDATE … WHERE <balance condition>` + check `affectedRows`); recompute remaining inside the lock. Add a `Promise.all` double-payment test → exactly one 201.

### [SEV-1] PATCH /api/shops/:id lets an admin reject a shop while bypassing the order-cancellation cascade and safety guard **[FIXED: a6c33dd]**

- **File:** `server/src/routes/shops.routes.ts:272-331` + `packages/shared/src/schemas/shop.schemas.ts:55-57`
- **Issue:** `updateShopSchema` includes `status`; `PATCH /:id` applies it (line 315) after fieldGuard (which only rejects `id`/`tenantId`). An admin can send `{"status":"rejected"}` and bypass every invariant in `POST /:id/reject` (shops.routes.ts:173-269): no dispatched/delivered-order check, no cancellation of pending/confirmed orders, no notifications — a shop with live dispatched orders becomes `rejected` while orders stay live. Tests only cover `/reject` (shops-visits.test.ts:336-376).
- **Best practice violated:** State transitions must be centralized; every mutation path must enforce the same invariants.
- **Fix:** Remove `status` from `updateShopSchema`; force transitions through `/approve` and `/reject` action endpoints.

### [SEV-1] `db:seed` wipes every table with no environment guard **[FIXED: b8e62b3]**

- **File:** `server/src/db/seed.ts:10-19`
- **Issue:** Seed starts by `DELETE`-ing all rows from all 9 tables unconditionally, then logs demo credentials (seed.ts:44). Running `npm run db:seed` with a misconfigured `.env` against any DB is instant silent data loss.
- **Best practice violated:** Destructive scripts must require explicit confirmation / environment guard.
- **Fix:** Refuse when `NODE_ENV === 'production'` (or require `--force` / `SEED_CONFIRM` env).

### [SEV-2] `authenticate`'s unit tests re-implement the middleware instead of testing it

- **File:** `server/src/__tests__/middleware.test.ts:259-287`
- **Issue:** The header-check tests copy the middleware's logic inline and assert on the copy — they never import the real `authenticate`. If the real middleware's header handling breaks, these tests still pass. The DB-dependent paths (tokenVersion revocation, inactive user) have no coverage.
- **Best practice violated:** Tests must exercise the real code path (no tautological re-implementations).
- **Fix:** Import the real middleware; `vi.mock` the db module so `jwt.verify` + DB checks are testable without MySQL.

### [SEV-2] Order status endpoint allows illegal transitions (delivered → pending_approval, cancelled → delivered, …)

- **File:** `server/src/routes/orders.routes.ts:570-596`
- **Issue:** Only the _set_ of statuses is validated, not the transition; notifications are generated for skipped states; `status as any` (line 596) bypasses types; no zod schema on the endpoint.
- **Best practice violated:** Finite state machines must be enforced server-side.
- **Fix:** Define a transition map (`pending_approval → confirmed|cancelled`, `confirmed → dispatched|cancelled`, `dispatched → delivered`, …) and 400 on anything else; add a zod schema.

### [SEV-2] Pagination is opt-in, unbounded, and accepts hostile values (limit=1000000, page=0, limit=-5 → 500s)

- **File:** `server/src/routes/shops.routes.ts:27-30`, `products.routes.ts:50-53`, `visits.routes.ts:66-69`, `orders.routes.ts:222-225`, `notifications.routes.ts:23-26`
- **Issue:** `parseInt(limitParam) || 10` accepts negatives/huge values (`LIMIT -5` → MySQL syntax error → 500; `limit=1000000` returns the whole table); when `page` is absent endpoints return **unbounded** lists (shops.routes.ts:52-58, orders.routes.ts:240-243, visits.routes.ts:90-96, users.routes.ts:163-185).
- **Best practice violated:** List endpoints must have enforced bounds and sane defaults.
- **Fix:** Clamp `limit` to [1,100], validate `page >= 1`, always paginate or cap the non-paginated branch. Add a `?page=0&limit=-5 → 400` test.

### [SEV-2] Central error middleware is dead code; every route re-implements generic 500 handling

- **File:** `server/src/index.ts:54-69`; e.g. `shops.routes.ts:123-126`, `orders.routes.ts:437-440`
- **Issue:** Routes wrap logic in try/catch returning `{error:'Internal server error'}`. The Express 5 error middleware only sees middleware errors. Consequences: no centralized error taxonomy (a `ER_DUP_ENTRY` from the register username race, auth.routes.ts:35-42, returns 500 instead of 409); inconsistent error logs; Express 5 async error propagation unused — a missed await inside a route silently hangs instead of 500ing.
- **Best practice violated:** Centralized error handling with error-type → status mapping; no try/catch in handlers.
- **Fix:** Throw domain errors (`ApiError(status, code)`) from routes and let them propagate; map DB error codes in one error middleware; log once, structured.

### [SEV-2] Validation coverage is patchy — 7 routes skip zod entirely **[PARTIAL: register-salesman + reset-password fixed in 405a9ee; refresh/verify-invite/PATCH /me/PATCH /:id/public-cancel/PATCH /:id/status still open]**

- **File:** `auth.routes.ts:150 (/refresh)`, `:186 (/verify-invite)`, `:220 (/register-salesman)`, `:296 (/reset-password)`; `users.routes.ts:47 (PATCH /me)`, `:188 (PATCH /:id)`; `orders.routes.ts:73 (public/cancel)`, `:570 (PATCH /:id/status)`
- **Issue:** Ad-hoc manual checks with inconsistent semantics — missing `token` on public/cancel returns 404 "Order not found" (missing _input_ reported as missing _resource_); /register-salesman re-implements password checks the shared schemas encode; /reset-password is a mock that logs the email.
- **Best practice violated:** Every input boundary validated by one mechanism.
- **Fix:** Add shared schemas (refreshSchema, verifyInviteSchema, registerSalesmanSchema, updateSelfSchema, orderStatusSchema, cancelOrderBodySchema) and apply `validate` uniformly; make reset-password real or clearly disabled.

### [SEV-2] Hardcoded fake dashboard metrics shipped as real data

- **File:** `server/src/routes/dashboard.routes.ts:79-89`
- **Issue:** `revenueChange: 12.0, // Match Stitch mockup: +12%` etc. are hardcoded to match a UI mockup; the dashboard test (dashboard.test.ts:98-122) only asserts real fields. Revenue also sums _unpaid_ orders (line 22-24 excludes only `cancelled`), so "Total Sales" isn't revenue.
- **Best practice violated:** APIs must not return fabricated data.
- **Fix:** Compute real period-over-period deltas or drop the fields; exclude unpaid orders from revenue or rename the metric.

### [SEV-2] Cancellation window: code hardcodes 24h while the shared contract says 2h — constant drift

- **File:** `server/src/routes/orders.routes.ts:413` vs `packages/shared/src/constants/index.ts:4-5`
- **Issue:** `CANCELLATION_WINDOW_HOURS = 2` is exported but never imported anywhere in server/ (grep: zero usages; same for `FREE_TIER_LIMITS`, `TOKEN_EXPIRY`). The route hardcodes `24 * 60 * 60 * 1000`. Test titles still say "15-minute window" (orders-payments.test.ts:406, 433).
- **Best practice violated:** Single source of truth for business constants.
- **Fix:** Import and use `CANCELLATION_WINDOW_HOURS`; fix stale test titles.

### [SEV-2] Tier limits declared but never enforced — any admin can mint unlimited admins

- **File:** `packages/shared/src/constants/index.ts:8-11` + `server/src/routes/users.routes.ts:136-145` + `packages/shared/src/schemas/auth.schemas.ts:25`
- **Issue:** `createEmployeeSchema` allows `role: 'admin'` and the route applies it with no check against `FREE_TIER_LIMITS.maxAdmins: 1`. The free-tier business model is unimplemented server-side.
- **Best practice violated:** Declared invariants must be enforced at the write boundary.
- **Fix:** Enforce max admin/salesman counts per tenant tier on user creation (409/403 with a clear message).

### [SEV-2] Public order invoice returns the full order row, including `tenantId` and `salesmanId`

- **File:** `server/src/routes/orders.routes.ts:62-66`
- **Issue:** `res.json({ ...order, shopName, items })` spreads every column of an _unauthenticated_ public endpoint: internal `tenantId`, `salesmanId`, `creditDueDate` leak to anyone holding the token URL.
- **Best practice violated:** Least exposure on public (unauthenticated) surfaces.
- **Fix:** Build an explicit invoice projection (id, status, shopName, items, totals, cancellation window only).

### [SEV-2] Missing critical test coverage: refresh happy path, invite flows, password-change revocation, pagination, payment double-spend race

- **File:** `server/src/__tests__/auth.test.ts` (no /refresh success, no /verify-invite, no /register-salesman), `orders-payments.test.ts` (no concurrent-payment race test)
- **Issue:** The suite is strong on CRUD/RBAC/tenant isolation but misses the security- and money-critical paths: refresh + tokenVersion behavior, invite registration (a public auth path), pagination params (the negative-limit 500 bug sails through), payment double-insert race.
- **Best practice violated:** Tests must cover security- and money-critical paths.
- **Fix:** Add: refresh flow (happy + revoked + inactive), register-salesman flow, PATCH /me password change → old access AND refresh tokens rejected, `?page=0&limit=-5` → 400, `Promise.all` double-payment → exactly one 201.

### [SEV-2] `fieldGuard` vs `validate` overlap — two ad-hoc guard mechanisms with different semantics

- **File:** `server/src/middleware/fieldGuard.ts:9-47` + `server/src/middleware/validate.ts:4-21`
- **Issue:** fieldGuard's `strip` mode is dead code; `reject` duplicates what zod `.strict()` gives you, with an ordering hazard (routes apply fieldGuard _before_ validate, e.g. users.routes.ts:117-118 — body mutated by one mechanism, re-parsed by another). Forgetting fieldGuard on a PATCH silently re-enables mass-assignment (orders.routes.ts PATCH /:id/status has neither).
- **Best practice violated:** One validation strategy per codebase.
- **Fix:** Make schemas strict (`.strict()`/`rejectUnknown`) and delete fieldGuard, or apply fieldGuard after validate on the parsed body + cover with route tests.

### [SEV-2] Migration tooling has two divergent paths; indexes only exist in a hand-rolled script

- **File:** `server/src/db/migrate.ts:69-97` (indexes) vs `server/src/db/schema.ts` (no `index()` declarations) vs `package.json` scripts (`db:push`/`db:generate`)
- **Issue:** `drizzle-kit push` derives schema from schema.ts which declares **no indexes** — all composite indexes live only in migrate.ts. A fresh dev DB via `db:push` gets no indexes; `db:migrate` never creates tables. Two sources of truth will drift. (setupTriggers.ts is properly idempotent — drop-if-exists then create.)
- **Best practice violated:** Single migration source of truth; schema and indexes defined together.
- **Fix:** Declare `index()`es in schema.ts and generate one real migration chain; make migrate.ts a thin wrapper or delete it.

### [SEV-3] Server hardening batch

- **File:** see each item
- 1. Pool event logging fires on every acquire/release at default level — `db/connection.ts:21-51`; gate behind LOG_LEVEL or remove (keep `enqueue` warn).
- 2. Money arithmetic in JS floats before storing as strings — `orders.routes.ts:398-409, 466, 536` (`parseFloat` × quantity, `+ 0.001` paper-over at :474). Compute in integer paise.
- 3. Order placement loads the entire tenant product catalog to price items — `orders.routes.ts:377, 392`; use `inArray(products.id, …)`. Same pattern in shops reject/delete (full orders table read, shops.routes.ts:190-197, :373-380).
- 4. `GET /api/orders/products` duplicates `GET /api/products` — `orders.routes.ts:154-164`; delete it.
- 5. Bare `GET /api/orders/public` 404s with "Order not found" — `orders.routes.ts:26-28`; return 400 or remove.
- 6. `tenantScope` is ceremonial (every valid JWT has tenantId; real scoping is per-query) — `tenantScope.ts:3-9`; document as assertion and scope _every_ write by `(id, tenantId)` (kills the TOCTOU class).
- 7. `app.listen` runs on import — tests spawn 8 real servers on :3001 (`index.ts:72-79`); guard behind `NODE_ENV !== 'test'` or split app/server modules.
- 8. Notifications `PATCH /:id/read` silently "succeeds" for non-existent/foreign notifications — `notifications.routes.ts:56-74`; check `affectedRows` → 404 (test enshrines the lie at notifications.e2e.test.ts:455-464).
- 9. Stray debug cruft: `console.log('REJECTED NOTIF STATUS:')` in notifications.e2e.test.ts:200-201; typo'd `'Bearer={adminToken}'` header in products.test.ts:285.
- 10. Product `taxRate` (product.schemas.ts:37) and wizard `imageUri` (:18, comment says "server maps to imageUrl" — no mapping exists) are accepted but silently dropped. Remove from schemas or implement persistence.
- 11. `redisStore` fallback claim is wrong when REDIS_URL is set but Redis is down — `rateLimiter.ts:14-34`; probe at boot and fall back to MemoryStore.
- 12. Health endpoint hardcodes `version: '0.1.0'` — `index.ts:44`; read from package.json.

---

## Client

### [SEV-1] Salesman users are redirected to a route group that does not exist — `(salesman)` is missing entirely **[FIXED: b7ba058]**

- **File:** `client/app/_layout.tsx:31`, `client/app/index.tsx:20` (only `(admin)` + `(auth)` exist)
- **Issue:** AuthRedirect sends `role === "salesman"` to `/(salesman)/visits` → unmatched route → `+not-found`; the salesman menu also points into the admin group (`client/src/components/layout/sideMenuItems.ts:19-22`). AuthRedirect has **no role check**, so a salesman deep-linking to `/(admin)/team` is never redirected.
- **Best practice violated:** Role-based route guarding; complete route groups for every supported role.
- **Fix:** Create the `(salesman)` group with `_layout.tsx` + guards, or block salesman logins until it ships; add role checks to AuthRedirect.

### [SEV-1] Logout does not clear the react-query cache — cross-tenant data leak on shared devices **[FIXED: deced6f]**

- **File:** `client/src/components/layout/SideMenu.tsx:87-91` → `client/src/stores/authStore.ts:98-107`
- **Issue:** `logout()` only deletes tokens + zustand state. The QueryClient (staleTime 5 min, `client/src/lib/queryClient.ts:6`) still holds the previous user's `["shops"]`, `["products"]`, `["orders"]`, `["visits"]`, `["employees"]`, `["dashboard","metrics"]` data. The next account on the same device renders the prior tenant's data instantly from cache.
- **Best practice violated:** Session lifecycle must clear server-state caches on logout.
- **Fix:** Call `queryClient.clear()` (or `removeQueries()`) inside `logout()`.

### [SEV-1] "Place Order" navigates to a route that doesn't exist; order creation is a stub **[OPEN — deferred until the order flow ships (user decision: order logic is not yet implemented)]**

- **File:** `client/app/(admin)/shops/index.tsx:102-104` → `router.push('/(admin)/orders/new?shopId=…')` (orders dir has only `index.tsx` + `select-products.tsx`; **no `orders/new.tsx`**)
- **Issue:** Tapping "Place Order" (grid card or map sheet) hits an unmatched route. Dashboard "New Order" FAB has **no `onPress`** (`client/app/(admin)/dashboard.tsx:29-45`); `select-products.tsx:149-155` "Review Order" just `router.back()` with a TODO; `orders/index.tsx` is a placeholder. The order feature is dead-end UI.
- **Best practice violated:** No dead navigation targets; no half-wired CTAs in shipped flows.
- **Fix:** Implement `orders/new.tsx` (or remove the CTAs); wire the FAB; land select-products into a review screen that submits via a mutation invalidating `["orders"]`.

### [SEV-1] Invite link hardcodes `http://localhost:8081` — copied links are broken for every real user **[FIXED: c770f04]**

- **File:** `client/app/(admin)/team/index.tsx:39`
- **Issue:** `const resolvedLink = \`http://localhost:8081/invite/${res.inviteToken}\``. The app has a deep-link scheme (`client/app.json:6` → `salesapp://`) and `EXPO_PUBLIC_*` env pattern, but neither is used here.
- **Best practice violated:** Environment-driven URL construction; deep links must resolve on-device.
- **Fix:** Build from `process.env.EXPO_PUBLIC_INVITE_BASE_URL` with a `salesapp://invite/<token>` fallback; never hardcode localhost.

### [SEV-2] `apiClient` has no timeout/abort and never tells the auth store when the session dies

- **File:** `client/src/lib/apiClient.ts:43-53` (fetch without AbortController), `:66-69` (terminal 401 wipes SecureStore but leaves zustand `isAuthenticated: true`), `client/src/stores/authStore.ts:120-124` (hydrate catches **any** error — incl. transient network failure — and deletes valid tokens, silently logging the user out at startup)
- **Best practice violated:** API clients need timeout/abort semantics; auth state must be a single source of truth synced on session expiry.
- **Fix:** Add `AbortSignal.timeout(…)`; on terminal 401 call store-level `sessionExpired()` (clear state + redirect); in `hydrate()` wipe tokens only on 401, not on network errors.

### [SEV-2] Image upload is fake: device-local `file://` URIs are stored as `imageUrl`

- **File:** `client/src/components/shared/ImageUploader.tsx:40-41, 69` → `client/app/(admin)/shops/new.tsx:84`, `client/app/(admin)/products/new.tsx:71`
- **Issue:** `ImagePicker` returns a local `file://` URI which is POSTed as `imageUrl` and stored as-is in the DB. No upload endpoint, no multipart, no signed URL. Any other device renders a broken image. The "up to 5MB" label (ImageUploader.tsx:122) is unenforced.
- **Best practice violated:** Upload pipelines must transfer bytes to storage, not persist client paths.
- **Fix:** Add a server upload endpoint (multipart → S3/local disk → URL), enforce size/type before pick, store the returned URL.

### [SEV-2] Team screen re-implements fetching instead of using the existing `useEmployees` hook

- **File:** `client/app/(admin)/team/index.tsx:16-30` (vs. `client/src/hooks/queries/useEmployees.ts` — unused)
- **Issue:** Local `useState/useEffect + apiClient` duplicates react-query: no cache, no refetch; `catch` swallows errors (:21-22) so a failed load renders as "No employees registered yet." — a misleading empty state. `useOrders`/`useOrder` are likewise dead code.
- **Best practice violated:** Single data-fetching path per resource; errors must be visible, not swallowed.
- **Fix:** Use `useEmployees()`; add error state + retry; delete dead hooks or wire them in.

### [SEV-2] Two parallel form primitives and duplicated auth schemas will drift

- **File:** `client/src/components/form/FormField.tsx` (auth forms) vs `client/src/components/shared/FormInputController.tsx` (wizard/CRUD forms); `client/src/lib/validation.ts:3-11` vs `packages/shared/src/schemas/auth.schemas.ts`
- **Issue:** Auth uses `FormField` (h-14/rounded-10), everything else uses `FormInputController` (h-11/rounded-lg) — two visual dialects, two code paths for the same primitive. Client `loginSchema` duplicates the shared one with **different rules** (client requires ≥6-char password at login; shared has none) — validation already diverged.
- **Best practice violated:** DRY; single source of truth for validation; consistent design-system primitives.
- **Fix:** Consolidate on one controller-based field; import auth schemas from `@sales-app/shared` (add client-specific refinements explicitly).

### [SEV-2] Client re-declares every shared model type — drift guaranteed

- **File:** `client/src/types/index.ts` vs `packages/shared/src/types/models.ts` + `enums.ts`
- **Issue:** Client imports only schemas from shared, never types — all domain types hand-copied with literal unions (`"admin" | "salesman"` instead of `UserRole`), timestamps `string` vs `Date`, etc. A new server field silently misses the client. Companion: pervasive `any` — `Wizard.tsx:23,27,39,126`, `FilterToolbar.tsx:51`, `Step2ShopLocation.tsx:89`, `ShopMapCanvas.native.tsx:262`, `shops/[id].tsx:168`.
- **Best practice violated:** Type reuse from the shared contract package; no `any` in strict-mode code.
- **Fix:** Derive client types from shared models (`z.infer` + `Omit`); remove `as any` casts with proper generics.

### [SEV-2] Release builds will fail all API calls: plain-HTTP API with no cleartext config

- **File:** `client/.env` (`http://192.168.31.94:3001`), generated `client/android/app/src/main/AndroidManifest.xml` (no `usesCleartextTraffic`)
- **Issue:** Android 9+ blocks cleartext HTTP in release; only the debug manifest allows it — a release APK gets network errors on every request. Also `RECORD_AUDIO` permission (`client/app.json:22`) is granted with no audio feature, and `android.package` is the placeholder `com.anonymous.client` (`app.json:26`).
- **Best practice violated:** Transport security config; least-privilege permissions; real package id before release.
- **Fix:** HTTPS for prod API + networkSecurityConfig (cleartext dev-only); drop `RECORD_AUDIO`; set a real package id.

### [SEV-2] Custom map markers freeze their snapshot while selection changes their appearance

- **File:** `client/src/features/shops/components/ShopMapCanvas.native.tsx:290` (`tracksViewChanges={false}`) with dynamic selected styling at :293-307
- **Issue:** `tracksViewChanges={false}` tells Android to keep the last rendered snapshot — the selection highlight (size/color change) may never appear on Android. Also `onPress` on MapView (:276-280) is relied on for pin placement (`Step2ShopLocation.tsx:562`) — historically unreliable on Android in some react-native-maps versions. `useTextureView` cast (:262) is `as any`.
- **Best practice violated:** react-native-maps custom-marker lifecycle (re-mount / toggle `tracksViewChanges` on content change).
- **Fix:** `tracksViewChanges={isSelected}` (or key-based re-mount on selection); add an on-device Android sanity test for `onPress` pin placement.

### [SEV-2] Mock/fake data and placeholder screens are one render away from production

- **File:** `client/src/features/dashboard/recent-orders-list.tsx:4, 19` (renders `MOCK_RECENT_ORDERS`), `client/app/(admin)/orders/index.tsx`, `client/app/(admin)/more/index.tsx` (placeholders), `client/App.tsx` + `client/index.ts` (Expo template boilerplate — dead, main is `expo-router/entry`)
- **Issue:** Fake order data ("Ramesh Kumar", "Patel Mart") ships in the source tree; nothing prevents mounting it. Two tab screens are bare `<Text>` placeholders.
- **Best practice violated:** No fabricated data in production code paths; no dead entry points.
- **Fix:** Delete mocks/dead components (`mockData.ts`, `RecentOrdersList`, `App.tsx`, `index.ts`) or gate behind `__DEV__`; implement or remove placeholder tabs.

### [SEV-3] Client hardening batch

- **File:** see each item
- 1. Store destructuring violates the selector convention — `client/app/index.tsx:6` (`const { isAuthenticated, isLoading, user } = useAuthStore()`; only offender). Split into selector calls.
- 2. Dead if/else in invite error mapping — `client/app/(auth)/invite/[token].tsx:79-83` (both branches set `username` error; `else` meant `password`).
- 3. Login failure renders the same error on both fields — `client/src/features/auth/login-form.tsx:35-36`; use one root error.
- 4. INR amounts lack thousands separators — `client/src/lib/format.ts:8` (`₹100000.00`; test pins it as intended). Use `Intl.NumberFormat("en-IN", …)` with fallback.
- 5. Deprecated jest-native matchers + filtered console warnings — `client/jest.setup.ts:11-30` (RNTL v14 ships built-in matchers), global `console.warn` filter (:374-384) can hide real regressions; coverage 21.2% with **no thresholds** in `client/jest.config.ts`.
- 6. Web-only scaffolding in a native-only app — `ShopMapCanvas.tsx` (web placeholder), `storage.ts` localStorage branch, `react-native-web` dep, `md:`/`cursor-pointer` classes in `invite/[token].tsx:147`. Delete or explicitly document web as supported.
- 7. Stale token in zustand after refresh — `client/src/lib/apiClient.ts:100-101` writes new tokens to SecureStore only; `authStore.token` keeps the old value.
- 8. Hardcoded fallback identity in SideMenu — `client/src/components/layout/SideMenu.tsx:74, 76` (`user?.username || "Michael Chen"`, `role = user?.role || "admin"`) silently masks missing user state and grants admin menu.

### [SEV-3] Don't chase the Android startup warning "Can't perform a React state update on a component that hasn't mounted yet" into app code — it's an expo-router 56.x internal bug, patched via patch-package **[FIXED: patches/expo-router+56.2.15.patch]**

- **Area:** Client
- **File:** `node_modules/expo-router/build/fork/useLinking.native.js:127,133` (patched); app code is NOT involved
- **Issue:** On every Android dev cold start, React 19 logs this warning right after `Running "main"`. LogBox component stack points at expo-router's `ContextNavigator`, call stack at `url.then` → `onUnhandledLinking` in the forked `useLinking.native.js`. Mechanism: react-navigation's `useThenable` starts the `getInitialState()` promise in a `useState` initializer (render-phase side effect); on Android expo-router's `getInitialURL()` always resolves to a string (root-URL fallback `salesapp:///` when there is no deep link), so the `.then` always calls `onUnhandledLinking("")` → `setLastUnhandledLink` — and on a dev cold start the promise wins the race against the navigator's first commit (the whole route graph executes inside its initial time-sliced render). Nothing in `app/` has even rendered at that point, so no change to `_layout.tsx`/`index.tsx`/`authStore` can fix it. Dev-only warning (React DEV build); no production impact. Still unfixed upstream as of expo-router 56.2.20 (diffed the forked files against 56.2.15 — identical).
- **Best practice violated:** N/A (upstream bug); for us: verify with the LogBox component/call stack before assuming app code is at fault.
- **Fix:** `patches/expo-router+56.2.15.patch` (applied by the root `postinstall` via patch-package) guards both `onUnhandledLinking` call sites in `getInitialState` to skip the empty root-fallback path — a normal launch is not an "unhandled link". Real deep-link paths (e.g. `shops/123`) are still recorded. If expo-router is upgraded, re-check whether upstream fixed this and regenerate or drop the patch (`npx patch-package expo-router`).

---

## Frontend / UI

### [SEV-1] `rounded-10`, `rounded-pill`, and `bg-primary` generate ZERO CSS — the design system's radius and primary backgrounds silently don't exist **[FIXED: 4ca33c9]**

- **File:** `client/global.css:7-22` (no `--radius-*` / `--color-primary` tokens in `@theme`); consumers: `components/ui/card.tsx:13` (`rounded-10`), `components/ui/button.tsx:30` (`rounded-pill`), `CategoryTabs.tsx:34`, `form/FormField.tsx:39`, `FilterToolbar.tsx:151`, `SearchablePillSelector.tsx:50`, `Wizard.tsx:313`, `orders/select-products.tsx:179`, `bg-primary` at `Step2ShopLocation.tsx:393`, `LocationPickerModal.tsx:164`, `shops/[id].tsx:312,658,822,825`
- **Issue:** **Verified by compiling the project's own PostCSS/Tailwind pipeline**: Tailwind v4 only emits `rounded-*` for named `--radius-*` theme keys; `bg-primary` needs `--color-primary`. No build error — classes are silently dropped. Every Card is square-cornered, every primary/secondary Button is a square rectangle, and the "Open Full Map" button / location-picker pin pill / "Create Order for Outlet" tile render **transparent backgrounds with white text** (invisible in bright daylight).
- **Best practice violated:** Centralized design tokens must be complete and resolvable; design system specifies 10px radius + pill shapes.
- **Fix:** Add `--radius-10: 10px`, `--radius-pill: 9999px`, `--color-primary: #121212` to `@theme` in `global.css` (or replace usages with `rounded-[10px]`/`rounded-full`/`bg-midnight`). Add a CI step that greps compiled CSS for a sentinel class list so silent drops can't happen again.

### [SEV-1] Primary CTAs with no `onPress` — dead buttons on dashboard, product detail, and dashboard lists **[OPEN — deferred until the order flow ships (user decision)]**

- **File:** `client/app/(admin)/dashboard.tsx:29-45` ("New Order" FAB — no onPress, no accessibilityRole), `client/app/(admin)/products/[id].tsx:516-517` ("Check Availability" / "Add to Order"), `client/src/features/dashboard/recent-visits-list.tsx:70-74` ("View All")
- **Issue:** The most prominent action on the admin dashboard and on product detail do nothing when tapped; a field agent tapping "Add to Order" gets zero feedback.
- **Best practice violated:** Interactive elements must have handlers; don't ship inert CTAs.
- **Fix:** Wire to real navigation (`/orders/select-products` etc.) or replace with a disabled state + label. (See also Client SEV-1 "order flow is a stub".)

### [SEV-1] Reduced-motion convention violated in the shops bottom sheet, map camera, and every `Modal` animation **[FIXED: b398914]**

- **File:** `ShopBottomSheetDrawer.tsx:51-73` (no `overrideReduceMotion`; siblings `FormSelect.tsx:123-125` and `FilterToolbar.tsx:220-222` do it right); `ShopMapCanvas.native.tsx:185-188,194-197,212-215,230-239` (`animateCamera` 400/500ms, `fitToCoordinates animated:true`); `LocationPickerModal.tsx:137` (`animationType="slide"`); `ImageUploader.tsx:131`, `useEditGuard.tsx:163`, `shops/[id].tsx:855`, `products/[id].tsx:530` (`animationType="fade"`)
- **Issue:** Repo convention (CLAUDE.md → Accessibility) requires every animation to check `useReducedMotion()` and run at duration 0 when enabled. These six spots animate unconditionally. The bottom sheet also snaps open at `index={1}` on mount (always visible at 45% when the map screen loads).
- **Best practice violated:** WCAG 2.3.3 reduced motion; explicit repo convention.
- **Fix:** `overrideReduceMotion={reducedMotion ? ReduceMotion.Always : ReduceMotion.Never}` on the drawer BottomSheet; gate map camera calls on `AccessibilityInfo.isReduceMotionEnabled`; modals: conditional `animationType={reducedMotion ? "none" : "fade"}`.

### [SEV-2] All long lists use `ScrollView` + `.map()` — no virtualization on the primary list screens

- **File:** `ShopGridView.tsx:92-107`, `app/(admin)/products/index.tsx:172-183`, `orders/select-products.tsx:239-247` (only `ShopBottomSheetDrawer.tsx:97` and `recent-orders-list.tsx:18` use FlatList)
- **Issue:** Every product/shop renders up front (product cards contain an Image) — jank + memory on mid-range Android as the catalog grows. Stable keys are respected (`key={item.id}`) but windowing is missing.
- **Best practice violated:** List virtualization for long lists (FlatList/FlashList with `initialNumToRender`, `windowSize`).
- **Fix:** Convert grids to FlatList `numColumns={2}` (or FlashList), keep `keyExtractor={item.id}`, `memo()` row components.

### [SEV-2] Touch targets below 44×44pt and icon-only buttons without labels

- **File:** `QuantityStepper.tsx:25-42,53-60` (`w-9 h-9` = 36pt); `ShopCard.tsx:147-153` (call button `w-10 h-10` = 40pt, **no `accessibilityLabel`**); `ImageUploader.tsx:98-105` (28pt); `Wizard.tsx:257-282` (32pt); `CategoryChips.tsx:107-124` (28pt); `ShopBottomSheetItem.tsx:121-129` (36pt)
- **Issue:** Repeated sub-44pt targets on frequently used controls — QuantityStepper is used in the order flow where the user is on the move in daylight.
- **Best practice violated:** Minimum touch target size (Apple HIG 44pt / Android 48dp); icon buttons need accessible names.
- **Fix:** `w-11 h-11`+ (or `min-h-11 min-w-11` + `hitSlop` where visual size must stay small); add `accessibilityLabel` to the ShopCard call button.

### [SEV-2] Shop status badge implemented 3× with 3 different non-token palettes

- **File:** `ShopCard.tsx:64-86` + `ShopBottomSheetItem.tsx:78-100` (`bg-amber-100 border-amber-300`, `bg-red-100 border-red-300`, hex `#d97706`/`#dc2626`, `text-[9px]`) vs `app/(admin)/shops/[id].tsx:90-121` (`bg-emerald-500/10`, `bg-amber-500/10`, `text-emerald-700`/`text-amber-700`)
- **Issue:** Same semantic statuses render in different colors/typography per screen; none use the design tokens (`success`/`warning`/`ember` exist in `global.css`). `text-[9px]` is unreadable in daylight.
- **Best practice violated:** Design-token adherence; check for existing components before creating.
- **Fix:** Extract one `ShopStatusBadge` using token colors + caption variant (mirror the `StockBadge` pattern in `products/StockBadge.tsx`); use it in all three places.

### [SEV-2] No Android hardware-back handling in the wizard flow — back exits and destroys form data

- **File:** `client/src/components/shared/Wizard.tsx:158-351` (no `BackHandler`/`beforeRemove`; `handleBack` only wired to the header button), used by `app/(admin)/shops/new.tsx`, `app/(admin)/products/new.tsx`
- **Issue:** Mid-wizard Android back pops the whole screen instead of going to the previous step; all typed data is lost without confirmation. (`useEditGuard` handles this correctly for edit screens but isn't used in wizards.)
- **Best practice violated:** Android back behavior — navigate, don't destroy state.
- **Fix:** Add `BackHandler` in `Wizard` mapping back → `handleBack` when `currentStep > 0`, else `onClose()`; consider an unsaved-changes prompt reusing the `useEditGuard` modal pattern.

### [SEV-2] Modal/bottom-sheet chrome duplicated with hardcoded hexes; `LocationPickerModal` ignores safe-area

- **File:** identical dialog markup (`bg-canvas…rounded-2xl p-6 w-full max-w-[340px] gap-4 shadow-xl`) at `ImageUploader.tsx:135`, `useEditGuard.tsx:167`, `shops/[id].tsx:859`, `products/[id].tsx:534`; identical sheet chrome (`handleIndicatorStyle` `#d1cfce`, `backgroundStyle` `#faf9f7`) at `FormSelect.tsx:113-114`, `FilterToolbar.tsx:201-211`, `ShopBottomSheetDrawer.tsx:56-73`; `LocationPickerModal.tsx:212-258` has `bottom-0` bar and `top-12` header with **no `useSafeAreaInsets`** (bottom card collides with Android nav bar, header floats under status bar); `bottom-48` (line 199) is a fragile magic number
- **Best practice violated:** Shared components + safe-area handling (Android-first).
- **Fix:** Extract `ConfirmDialog` + `SheetChrome` (or constants for handle/background styles) in `components/shared`; add insets to `LocationPickerModal` (paddingBottom: `insets.bottom + 16`).

### [SEV-2] Form errors are not announced to screen readers; inputs lack label association

- **File:** `FormInput.tsx:68-87` (no `accessibilityLabel`/`aria-labelledby` binding to its label; no `accessibilityLiveRegion` on error at :91-97); `form/FormField.tsx:43-61` (same); `FormSelect.tsx:80-99` (trigger has label, but the options list isn't announced as a dialog)
- **Issue:** TalkBack users get unlabeled text fields; validation errors appear silently with no announcement — field errors can be missed entirely.
- **Best practice violated:** WCAG 4.1.2 / 3.3.1 — labels and error announcements.
- **Fix:** `accessibilityLabel={label}` (or `aria-labelledby`), `accessibilityLiveRegion="polite"` on error Text, `accessibilityState={{ disabled }}` when `editable={false}`.

### [SEV-2] Dashboard error/empty handling is inconsistent with list screens — no retry, misleading empties

- **File:** `metrics-grid.tsx:78-89` and `recent-visits-list.tsx:48-60` (error cards with **no Retry**; shops/products screens all have one, e.g. `shops/index.tsx:72-86`); `team/index.tsx:21-26` swallows errors then renders "No employees registered yet" (network failure looks like an empty team); `recent-visits-list.tsx:22` `formatTime` fallback fabricates `"10:45 AM"` on parse failure
- **Best practice violated:** Consistent loading/empty/error state-of-UI treatment; errors must be visible.
- **Fix:** Retry (refetch) action on dashboard cards; real error state in TeamScreen; remove the fake time fallback (render "–").

### [SEV-2] Image handling: no caching, no failure fallback, no dimension control

- **File:** `ProductCard.tsx:17-34` (plain RN `Image`, `h-32`; URL 404 → blank box, no `onError` fallback), `orders/select-products.tsx:34-45` (same), `ImageUploader.tsx:90-95` (preview `h-60`, no `defaultSource`, no size validation despite the "up to 5MB" claim at :122)
- **Issue:** RN's `Image` has no disk cache on Android — field agents re-download every product photo on every list render; failed loads show empty space. `expo-image` is not installed.
- **Best practice violated:** Image caching (`expo-image` with `cachePolicy`), error placeholders.
- **Fix:** Adopt `expo-image` (`contentFit`, `placeholder`, `cachePolicy="memory-disk"`, `onError` → fallback icon); enforce the 5MB/type check in `ImageUploader` before `onImageSelected`.

### [SEV-3] Frontend hardening batch

- **File:** see each item
- 1. Token hex values hardcoded ~180× instead of `@theme` tokens — e.g. `#848281` ×50, `#ff3e00` ×44 across `src/` + `app/`; `SideMenu.tsx:133` uses `bg-[#343433]` instead of `bg-charcoal`, `:197` `text-[#ff3e00]` instead of `text-ember`. Introduce `src/lib/colors.ts` for JS contexts (icons, ActivityIndicator, placeholderTextColor).
- 2. Radius/spacing drift: `rounded-xl` (12px) overrides Card's intended 10px at `metrics-grid.tsx:31`, `recent-visits-list.tsx:85`, `ShopCard.tsx:54`, `ShopBottomSheetItem.tsx:51`, `SideMenu.tsx:101`; `rounded-2xl` (16px) at auth forms/`team/index.tsx:82`/`ImageUploader.tsx:135`; `rounded-t-3xl` (24px) at `LocationPickerModal.tsx:212`; off-grid `px-[22px]` (`dashboard.tsx:30`); `text-[9px]/[10px]/[11px]` overrides (`ShopCard.tsx:79`, `team/index.tsx:207`, `ProductCard.tsx:56`). Add a lint rule banning radius/text-size overrides.
- 3. Shadow utilities everywhere despite the "no floating shadows — 1px stone inset borders" spec — `ShopCard.tsx:54,58`, `FilterToolbar.tsx:151,236,267,288`, `StockBadge.tsx:39-45`, `LocationPickerModal.tsx:164-212`, auth forms, `dashboard.tsx:31-38`, etc. Remove from surfaces (keep on true overlays: FABs, map controls, sheets); rely on `border-stone-border`.
- 4. Dead code: `ScreenShell.tsx` + `TabScreen.tsx` zero usages while every screen rolls its own header with different magic bottom offsets (`insets.bottom + 66/70/76/80/100` across `TabScreen.tsx:31`, `Wizard.tsx:164`, `products/index.tsx:195`, `ShopGridView.tsx:72`, `dashboard.tsx:18`); `hover:*` classes are web-only no-ops on native (`Step1ShopIdentity.tsx:122,150`, `Step2ShopLocation.tsx:467`, `reset-password-form.tsx:49`); `Wizard.tsx:304` passes `fieldErrors={{}}` (dead prop); `orders/index.tsx` + `more/index.tsx` are bare-text stubs behind live tabs; `Step2ShopLocation.tsx:465` keys suggestions by `index`; no `<StatusBar>` configured anywhere (expo-status-bar installed but unused).
- 5. `recent-orders-list.tsx:36` status colors hardcoded hexes with a `bg + "20"` alpha-concat hack — use token classes. (Component also renders mock data — see Client SEV-2.)

---

## Architecture / Low-Level Design

### [SEV-1] The shared contract is a lie: `packages/shared` types say `number`, the API actually returns `string` — and the client keeps its own parallel type universe that drifted **[PARTIAL: phantom Product fields (weight/dimensions/material) removed in abaa13d; number/string wire drift + client type-universe consolidation still open]**

- **File:** `packages/shared/src/types/models.ts:41-42,66,82` vs `client/src/types/index.ts:28-29,54,79` vs `server/src/routes/products.routes.ts:116,158` + `shops.routes.ts:102-103,313-314`
- **Issue:** MySQL DECIMAL columns come back as strings and the server even forces it (`price: String(price)`); shared models/schemas say `number` (shop.schemas.ts:29-30); the client hand-patched its types to `string` to match reality → full parallel type universe (110 lines) with drift: `Product.weight/dimensions/material` (client types/index.ts:60-62) exist in **no DB column** (schema.ts:105-119) and are read in `products/[id].tsx:448-453` (always undefined); `DashboardMetrics.totalOrders` (types/index.ts:93) is never returned by the server; client `User` drops `tenantName` that the server sends. Every consumer pays the tax: `parseFloat(product.price)` (products/index.tsx:26), `Number(shop.latitude)` (shops/[id].tsx:163-164,583-584).
- **Best practice violated:** Single source of truth; types that lie to consumers.
- **Fix:** Pick one wire format — keep DECIMAL strings at the DB but parse to `number` in per-entity response serializers on the server, or change shared types to `string` + `z.coerce.number()` at the boundary. Delete `client/src/types/index.ts`; import from `@sales-app/shared`. Remove phantom fields or add DB columns.

### [SEV-1] Client-side Zod schemas duplicate `packages/shared` with behavioral divergence — the client rejects valid server input **[FIXED: 20b35af]**

- **File:** `client/src/lib/validation.ts:3-11` vs `packages/shared/src/schemas/auth.schemas.ts:14-18` (loginSchema); `validation.ts:15-21` vs `auth.schemas.ts:5-11` (signup); `validation.ts:41-49` vs `product.schemas.ts:28-39` (productEdit)
- **Issue:** Client `loginSchema` adds `.min(6, "Password must be at least 6 characters")` that the shared/server schema does **not** have — a user with a valid 4-char password can never log in from the app. Signup drops `max(255)`/`max(128)`/phone `min(10)` bounds; `productEditSchema` uses `imageUri` where the server schema says `imageUrl`, and omits `sku`/`taxRate`.
- **Best practice violated:** DRY; single source of truth for validation.
- **Fix:** Delete `client/src/lib/validation.ts`; re-export shared schemas from the client (zod schemas are isomorphic — use them directly in `zodResolver`). If client rules must differ, derive via `.extend()`, never fork.

### [SEV-1] `taxRate` is collected, validated, sent — then silently dropped by the server **[FIXED: d0a991b]** _(removed end-to-end — user confirmed tax rate is not needed)_

- **File:** `client/src/features/products/Step2Pricing.tsx:102-147` → `app/(admin)/products/new.tsx:70` → `packages/shared/src/schemas/product.schemas.ts:37` → `server/src/routes/products.routes.ts:107-122` (destructured but never inserted; no column in `db/schema.ts:105-119`)
- **Issue:** The wizard collects a tax rate, the schema validates it, the client sends it, and the server ignores it with no error. User data is lost silently.
- **Best practice violated:** Fail loudly, not silently (no silent data loss).
- **Fix:** Add `taxRate` to the products table + insert/update mappings, or remove it from the wizard + schema. Add a server test asserting every validated field lands in the DB.

### [SEV-2] No service layer: 630-line route files own all business logic; the global error handler is dead code

- **File:** `server/src/routes/orders.routes.ts` (630 lines), `shops.routes.ts` (404 lines) — only `services/notification.service.ts` exists; `server/src/index.ts:54-69` global error handler never fires because every handler wraps itself in try/catch + `res.status(500)` (30+ copies)
- **Issue:** Order pricing math, cancellation windows, payment-status transitions, and the reject-shop-cancels-orders flow (shops.routes.ts:190-263) live inside route handlers. Duplicated business logic: payment calculation in `orders.routes.ts:464-477` vs `534-542`; the dispatched/delivered guard in `shops.routes.ts:195-197` vs `378-380`.
- **Best practice violated:** Layering (thin routes, fat services); DRY; SRP.
- **Fix:** Extract `services/order.service.ts` (placeOrder, recordPayment, markPaid, transitionStatus) and `services/shop.service.ts` (reject + order cancellation). Let handlers throw and use the global error handler (Express 5 propagates async errors) — one error path instead of 30. (See also Server SEV-2 "error middleware is dead code".)

### [SEV-2] Order statuses are re-declared in 4+ places with no transition map — adding a status is a multi-file landmine

- **File:** `orders.routes.ts:576` (`allowedStatuses`), `:183` (raw SQL `IN ('pending_approval','confirmed','dispatched')`), `:99-101` (cancel guards); `shops.routes.ts:196,209`; `db/schema.ts:140-146` (mysqlEnum); `packages/shared/src/types/enums.ts:22-29`; client `types/index.ts:75-76`
- **Issue:** No single status source, no transition validation — `PATCH /:id/status` accepts any status from any status. Adding "returned" requires touching 7 files with no compiler help.
- **Best practice violated:** DRY; single source of truth; defensive state machines.
- **Fix:** Define `ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]>` in `packages/shared`, derive `allowedStatuses` from the `OrderStatus` enum, validate transitions against it. (See Server SEV-2 "illegal transitions".)

### [SEV-2] Zero react-query mutations: every write is a raw `apiClient` call scattered in screens; the team screen bypasses react-query entirely

- **File:** `grep useMutation` → no hits in client. Writes at: `shops/index.tsx:116` (delete), `products/index.tsx:122` (delete), `shops/[id].tsx:196,891` (patch/delete), `products/[id].tsx:129` (patch), `shops/new.tsx:77`, `products/new.tsx:62` (create), `team/index.tsx:35` (invite). `team/index.tsx:10-30` uses raw `useState`+`useEffect`+`apiClient` while `hooks/queries/useEmployees.ts` exists and is **never imported** (dead code)
- **Issue:** No mutation hooks → no pending/error state, no optimistic updates, manual `invalidateQueries` call sites that can drift from query keys (and do: `["shops", id]` vs `["shops"]` at shops/[id].tsx:212-213). Three near-identical delete flows (`apiClient DELETE` + invalidate + Alert) exist at shops/index.tsx:114-124, products/index.tsx:120-127, shops/[id].tsx:887-908.
- **Best practice violated:** Consistent data layer; DRY; separation of concerns (screens shouldn't know query keys).
- **Fix:** Add `useMutation`-based hooks per entity (`useDeleteShop`, `useUpdateProduct`, `useCreateOrder`…) that own invalidations; refactor team screen onto `useEmployees` + a mutation.

### [SEV-2] Near-identical components: success screens, skeletons, error states, pills, numeric inputs, layout shells

- **File:** `ShopRegisteredSuccess.tsx` vs `ProductAddedSuccess.tsx` (~95% identical — same shared values, same 2000ms timer, only heading/body text differ; `productName`/`productId` props unused in ProductAddedSuccess:51-52); `SkeletonShopGrid` (ShopGridView.tsx:20-39) vs `SkeletonGrid` (products/index.tsx:63-79) vs `LoadingSkeleton` (shops/[id].tsx:53-69, products/[id].tsx:36-55, select-products.tsx:80-95); `ErrorState` duplicated at shops/index.tsx:72-86, products/index.tsx:81-95, shops/[id].tsx:71-85, products/[id].tsx:57-71, select-products.tsx:210-222; numeric Controller+TextInput block copied 4× (`Step2Pricing.tsx:45-90` price, `:103-147` taxRate, `products/[id].tsx:214-258` price, `:261-298` stock); `UNIT_OPTIONS` duplicated (`Step2Pricing.tsx:7-13` vs `products/[id].tsx:28-34`); pill/chip styling triplicated (`CategoryChips.tsx:53-74`, `CategoryTabs.tsx:30-52`, `FilterToolbar.tsx:234-249`, `SearchablePillSelector.tsx:97-101`); `ScreenShell.tsx` vs `TabScreen.tsx` — both **completely unused**, while every screen hand-rolls `<View className="flex-1 bg-canvas">` + insets + ScrollView
- **Best practice violated:** DRY; "check for existing components before creating" (CLAUDE.md) — dead lookalikes actively mislead future agents.
- **Fix:** Extract `SuccessCelebration` (props: heading, body), `SkeletonList`, `ErrorState`, `NumericInputController` (decimal/integer modes), `Chip`/`Pill` primitives, and one `ScreenShell`. Delete dead files or wire them up.

### [SEV-2] God screens: shops/[id].tsx (927 lines) and products/[id].tsx (573 lines) mix fetch, auth, forms, modals, share/call/WhatsApp/directions, and map

- **File:** `client/app/(admin)/shops/[id].tsx` (detail view + `EditShopForm` + delete modal + useEditGuard wiring), `client/app/(admin)/products/[id].tsx` (same shape); `additionalOwners` field-array markup duplicated between `Step1ShopIdentity.tsx:106-163` and shops/[id].tsx:304-365; location-picker row duplicated between `Step2ShopLocation.tsx:373-415` and shops/[id].tsx:367-399; delete-confirmation `Modal` (shops/[id].tsx:852-924) duplicates the useEditGuard modal pattern
- **Best practice violated:** SRP; component size.
- **Fix:** Extract `ShopDetailView`/`ShopEditForm`/`ProductEditForm` into `features/`; reuse the wizard's `AdditionalOwnersFieldArray` and a shared `LocationPickerRow`; share delete-confirmation via a `ConfirmDeleteModal` component.

### [SEV-2] Inconsistent API response shapes for the same resource; auth user objects hand-built 3× with differing fields

- **File:** PATCH shops → `{message, shop}` (shops.routes.ts:322-325), PATCH products → `{message, product}` (products.routes.ts:167), PATCH order status → `{message, order}` (orders.routes.ts:623) — but GET/create return bare entities; register response omits `createdAt` while login includes it (auth.routes.ts:79-89 vs 131-142); `/me` returns `tokenVersion` (users.routes.ts:35-39) but login/register don't; auth user object hand-built at auth.routes.ts:79-89, 131-142, 278-288
- **Best practice violated:** Consistent API contract; DRY.
- **Fix:** Per-entity response serializers (`toUserDTO`, `toShopDTO`…) in one place.

### [SEV-3] Architecture hardening batch

- **File:** see each item
- 1. Wizard step contract has three dead props; `onComplete` return value unused — `Wizard.tsx:22-28` (WizardStep.component props), `:304` (`fieldErrors={{}}` always), `:221` (ignores documented `Promise<string>`); no step component ever calls `onDataChange(` or reads `fieldErrors`/`initialData` — data flows through `useFormContext`. Strip the dead API surface; have `onComplete`'s returned id drive success navigation instead of the duplicated `createdXRef` pattern in both `new.tsx` screens.
- 2. Naming/folder inconsistencies — kebab-case (`metrics-grid.tsx`, `sideMenuItems.ts`, `useEditGuard.tsx`) vs PascalCase (`ShopGridView.tsx`, `Step1ShopIdentity.tsx`) in the same `src/features`; `useShop`/`useOrder` live inside `useShops.ts`/`useOrders.ts` but `useProduct` has its own file; endpoint prefixing inconsistency: `apiClient("/auth/login")` (authStore.ts:33) vs `apiClient("/api/users/me")` (authStore.ts:115) — pick one style (suggest all `/api/`); `useShop(id?: string)` vs `useProduct(id: string)` — optional vs required id.
- 3. `useEditGuard.tsx:159-212` returns a `<Modal>` JSX node from a hook — two mounted guards would double-modals (both detail screens render it); consider a named `ConfirmationModal` component.
- 4. `shops/[id].tsx:755` uses `key={idx}` for co-owners (reorder/remove breaks state) — CLAUDE.md requires stable keys; give co-owners an id or key by `${name}-${phone}-${idx}`.
- 5. `NotificationType` union re-declared in `notification.service.ts:6` instead of derived from shared.
- 6. Testability: client tests mock internals (ShopDetailScreen.test.tsx mocks `useShops`/`authStore`/expo-router) while server tests are true E2E — push logic into prop-driven components + mutation hooks, add `testID`s consistently, consider MSW for apiClient-level tests.

---

## Testing

### [SEV-2] Client test gaps: no API-layer tests, no auth-flow tests, and the map/detail tests can't catch regressions

- **File:** `client/src/__tests__/` (see per-item paths)
- **Issue:**
  - **No API-layer tests at all** — the 401 refresh queue + retry-once logic in `apiClient.ts:55-114` (the most intricate client code) is 0% covered; a broken refresh flow ships silently.
  - **No auth-flow tests** — login/signup/reset/invite forms + `authStore` login/logout/hydrate untested (the hydrate-wipes-tokens-on-network-error bug would be caught by one test).
  - **No mutation-screen tests** — `shops/new.tsx` / `products/new.tsx` `onComplete` (POST → `invalidateQueries`) untested; `team/index.tsx` invite generation untested.
  - **`ShopMapCanvas.test.tsx` is vacuous where it matters** — "selected marker with different pin color" only asserts markers exist; permissive map mock (any props → View) means a dropped `coordinate` or broken `tracksViewChanges` passes.
  - **`ShopDetailScreen.test.tsx` mocks `useShop` + `authStore`** — query layer and role-gated rendering skipped; a wrong endpoint or missing role guard passes.
  - **`WizardShopFlow.test.tsx` never runs the Wizard** — renders steps in a bare `FormProvider`; real wiring (schemas × steps × submit) untested.
- **Best practice violated:** Tests must assert user-observable behavior through the real code path (repo convention); critical flows must be covered.
- **Fix:** Add apiClient + authStore suites; test mutation screens via RNTL `fireEvent` on real components; tighten map-mock props (assert `coordinate`/`tracksViewChanges`); run real Wizard in flow tests; add `coverageThreshold` to jest.config.ts.

### [SEV-2] Server test gaps: refresh, invites, pagination, and money races untested

- **File:** `server/src/__tests__/auth.test.ts`, `orders-payments.test.ts`
- **Issue:** `/auth/refresh` success + revocation, `/verify-invite`, `/register-salesman`, pagination bounds, and the concurrent double-payment race have no tests — the exact spots where the code currently has bugs (see Server SEV-1/SEV-2).
- **Best practice violated:** Tests must cover security- and money-critical paths.
- **Fix:** See the "Missing critical test coverage" entry under Server.

### [SEV-3] Deprecated `@testing-library/jest-native` + global console.warn filter can hide regressions

- **File:** `client/jest.setup.ts:11-30, 374-384`, `client/jest.config.ts`
- **Issue:** jest-native v5 is deprecated (RNTL v14 has built-in matchers); the blanket `console.warn` filter can silence actionable warnings; coverage is 21.2% with no thresholds.
- **Best practice violated:** Test infra must fail loudly on real problems.
- **Fix:** Drop jest-native; narrow the warn filter to known-noise patterns; add `coverageThreshold` + CI `--coverage` gate.

### [SEV-3] Server integration suite is FLAKY in full runs with local MySQL — failures rotate across files, every file passes in isolation

- **File:** `server/src/__tests__/` (all DB suites) + `server/src/index.ts` (was), `server/src/app.ts`
- **Issue:** Running the whole suite against the local `mysql-local` container produces random failures (401/400 on login/refresh/deactivate flows, "order not found" on payments, etc.) that rotate between runs and disappear when any single file runs alone. Observed Aug 2026 during the audit-fix pass: `auth.test.ts`, `deactivation.test.ts`, `dashboard.test.ts`, `notifications.e2e.test.ts`, `orders-payments.test.ts` all failed in different runs, and passed in isolation. The trigger correlates with `health.test.ts` / `middleware.test.ts` sharing the run. Pre-existing — NOT caused by the fixes (verified by running the DB suites without the two unit files: fully deterministic).
- **Best practice violated:** Test runs must be deterministic.
- **Root-cause investigation (2026-08-05 follow-up, branch `fix/test-flakiness`):**
  - **Confirmed flaw (fixed):** `server/src/index.ts` called `app.listen(PORT)` at module import time — a side-effectful import. Any test file importing `{ app }` booted a real server; parallel vitest forks raced for port 3001 (`EADDRINUSE`), and the unhandled server `error` event is a worker-crash hazard. Fixed by extracting the express app into `server/src/app.ts` (no listen) and keeping the listener only in the `index.ts` entry.
  - **Exonerated:** supertest wraps the app in its own ephemeral server (`typeof app === 'function'` → `http.createServer(app)` + `listen(0)`), so test traffic never touches port 3001 — the listen race cannot corrupt responses, only crash forks.
  - **Exonerated:** MySQL pool exhaustion — `max_connections` 151, `Max_used_connections` peaked at 9 during failing runs, zero errors in container logs.
  - **Exonerated:** leftover-data collisions — only `users.username` is unique-indexed and every test uses UUID usernames; fixed emails/phones are not constrained.
  - **Anomaly:** failing runs returned `400` responses with no `error` body — no code path in the app produces that shape, pointing at an external/transient cause. Repo reflog shows heavy branch/commit churn on the same machine in the exact failing window (audit wrap-up), consistent with concurrent test-suite activity against the shared `sales_app_dev` DB (the audit ran 5 parallel subagents).
- **Verification:** after the `app.ts` split, 25+ consecutive full-suite runs (including two simultaneous identical suites against the same DB) all green. Plain `npm run test:server` (i.e. `vitest run`) is the canonical command — the workaround below is no longer required, but kept as a fallback if symptoms recur.
- **Fallback workaround (if it ever flakes again):**
  `cd server && npx vitest run --fileParallelism=false --silent --exclude src/__tests__/health.test.ts --exclude src/__tests__/middleware.test.ts`
  `cd server && npx vitest run src/__tests__/health.test.ts src/__tests__/middleware.test.ts --silent`

---

## Audit trail

| Date       | Audit                                                                                      | Source                                                   |
| ---------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 2026-08-05 | Security / Server / Client / Design / Frontend best-practices audit (5 parallel subagents) | Branch `review/best-practices-audit`                     |
| 2026-08-05 | 11 fixes applied & committed (S1-S7, C1-C6) — see [FIXED] markers per entry                | Branch `review/best-practices-audit` (2e9fb31 → b398914) |
| 2026-08-05 | SEV-3 test-flakiness root-cause investigation + `app.ts` split fix                         | Branch `fix/test-flakiness`                              |
