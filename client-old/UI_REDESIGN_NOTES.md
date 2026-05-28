# UI Redesign Notes (Ionic Migration)

This document captures architectural patterns and constraints to follow when redesigning the UI with Ionic components. The goal is a mobile-first, elegant UI where Ionic components can later be swapped for native Capacitor elements.

## Architecture Principle

**Business logic and UI must remain separate.** Hooks handle data/state/actions. Components receive props and fire callbacks. Components should be swappable from shadcn/Tailwind → Ionic without touching hooks, stores, or API layer.

## Data Hooks (already extracted)

All business logic lives in `src/hooks/`. Each hook encapsulates:

| Hook | Responsibility |
|------|---------------|
| `useShops` | fetch, filter, sort, addShop, editShop, approveShop, rejectShop |
| `useOrders` | fetch, filter, sort, addOrder, recordPayment, markOrderPaid |
| `useVisits` | fetch, filter, addVisit (with GPS check-in) |
| `useEmployees` | fetch, addEmployee, toggleEmployeeStatus, generateInviteLink |
| `useProducts` | fetch, filter, addProduct, editProduct, deleteProduct |
| `useGeolocation` | getCurrentPosition, proximity/Haversine distance calculation |
| `useFavorites` | starred shop IDs (localStorage read/write/toggle) |

**Rule for Ionic redesign:** Pages import hooks for data + actions. Pages import Ionic components for rendering. Never mix API calls or business logic in Ionic component files.

## Presentational Component Patterns (to create during redesign)

When building the new Ionic UI, follow these patterns:

1. **Components receive data via props, never access stores directly**
   - `ShopCard` receives `shop`, `distance`, `isFavorited`, `ordersCount`, `visitsCount`, `lastVisitedText` and callback props `onCheckIn`, `onOrder`, `onToggleFavorite`
   - Never import `useAppStore` or `useAuthStore` in a presentational component

2. **Components fire callbacks, never call APIs**
   - `onCheckIn(shopId)` — parent page uses the hook to perform the action
   - Never call `apiClient` or `addVisit()` directly from a presentational component

3. **Shared presentational components to create:**
   - `ShopCard` — replaces inline ShopTile usage variations
   - `OrderListItem` — replaces inline order row JSX (currently duplicated 3×)
   - `VisitTimelineItem` — replaces inline visit timeline JSX (currently duplicated 3×)
   - `EmployeeCard` — replaces inline employee card JSX
   - `StatusBadge` — centralized order status + payment status badges
   - `EmptyState` — reusable empty state with icon, title, description
   - `FilterBar` — shop selector dropdown + search input + sort controls
   - `ConfirmDialog` — warning/confirmation modal

## Shared Constants (already centralized)

Import from `src/lib/constants.ts`:
- `ORDER_STATUS_COLORS` — pending_approval, confirmed, dispatched, delivered, cancelled
- `PAYMENT_STATUS_COLORS` — unpaid, partially_paid, paid
- `formatDate()`, `formatDateTime()`, `formatCurrency()` — date and currency formatters
- `ONGOING_ORDER_STATUSES`, `DELIVERED_ORDER_STATUSES` — status filter groups

**Do not redefine these in individual components.**

## Toast/Notification Pattern

Store actions no longer call `toast`. The pattern is:
1. Hook action returns a result or throws an error
2. Page/caller decides how to present feedback (toast, inline message, etc.)

This lets the same hook power different UI implementations (web toast vs native dialog).

## Current Duplication to Eliminate During Redesign

These are duplicated across `AdminDashboard`, `SalesmanDashboard`, and `AdminShopDetails`:

1. **Status color maps** — `statusColors` and `paymentColors` objects → use `src/lib/constants.ts`
2. **Date formatting** — month name arrays, `toLocaleDateString` calls → use `formatDate()` from constants
3. **Visit filtering** — `visits.filter(v => v.shopId === ...)` → use hook's built-in filter
4. **Order sorting** — sort functions repeated → use hook's built-in sort
5. **Empty state markup** — duplicated text and layout → use `EmptyState` component

## Ionic-Specific Notes

- Capacitor is already configured (`capacitor.config.ts`, `@capacitor/core` v8)
- Ionic components have their own touch/gesture handling — may replace `SwipeableContainer` and `SwipeableTabs`
- Ionic uses `ion-` prefixed custom elements — wrap in React components following the same props/callbacks pattern as current components
- Ionic's `IonContent`, `IonPage`, `IonHeader`, `IonToolbar`, `IonTabBar`, `IonTabs` map naturally to the current `SidebarLayout` + tab structure
- The `PaginatedList` component can be replaced with Ionic's `IonInfiniteScroll`
- Modals/sheets currently use Radix `Sheet` — Ionic has `IonModal` and `IonActionSheet`
- Forms currently use react-hook-form — Ionic has `IonInput`, `IonSelect` which work with react-hook-form's `register()`

## Files That Will Need Most Rework During Redesign

1. `pages/admin/AdminDashboard.tsx` — 1413 lines, needs complete decomposition
2. `pages/salesman/SalesmanDashboard.tsx` — 1330 lines, same
3. `pages/admin/AdminShopDetails.tsx` — 658 lines
4. `components/layout/SidebarLayout.tsx` — will be replaced by Ionic shell components
5. `components/ui/` — most shadcn primitives replaced by Ionic equivalents

## Files That Should NOT Change Much

1. `stores/` — business logic stays
2. `hooks/` — data hooks stay (newly extracted)
3. `api/client.ts` — API layer stays
4. `guards/` — route guards stay
5. `lib/constants.ts` — shared constants stay
6. `lib/queryClient.ts` — TanStack Query config stays
