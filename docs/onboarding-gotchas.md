# Product Onboarding Flow — Gotchas & Lessons Learned

Compiled after building the product creation wizard. Every issue below should be
checked against future onboarding flows (new order, new employee, new shop, etc.).

---

## 1. Monorepo & Bundler

### 1.1 First `@sales-app/shared` import breaks Metro
**Symptom:** `Unable to resolve "./types/index.js" from "packages/shared/src/index.ts"`
**Root cause:** Metro only watches the client directory by default. The shared package
is in a workspace outside the project root.
**Fix:** Add `watchFolders` to `client/metro.config.js`:
```js
const workspaceRoot = path.resolve(projectRoot, "..", "..");
config.watchFolders = [workspaceRoot];
```
**Prevention:** Every new client route/component that imports from `@sales-app/shared`
needs this config. It's a one-time setup, but missed in the initial scaffold.

### 1.2 `.js` extensions in TypeScript imports break Metro
**Symptom:** Metro looks for `index.js.ts` instead of `index.ts` — can't resolve.
**Root cause:** Shared package used ESM-style `.js` extensions in import paths
(`from './types/index.js'`). Metro appends candidate extensions AFTER `.js`.
**Fix:** Remove `.js` extensions from all imports in `packages/shared/src/`:
```ts
// Before: export * from './types/index.js';
// After:  export * from './types/index';
```
**Prevention:** Never use `.js` extensions in TypeScript imports within the monorepo.
Both Metro and `tsx` handle extensionless imports fine.

### 1.3 New files not picked up by Metro
**Symptom:** `Element type is invalid: expected a string... but got: undefined`
**Root cause:** Metro caches the module graph. Newly created files aren't discovered
until the dev server restarts.
**Fix:** `npx expo start --clear` or kill and restart the server.
**Prevention:** After creating new files, restart the dev server.

---

## 2. API & Data Fetching

### 2.1 Raw `fetch` instead of `apiClient`
**Symptom:** `[SyntaxError: Unexpected token '<', "<!DOCTYPE "...]` — API returns HTML.
**Root cause:** Used `fetch("/api/categories")` (relative URL, hits Expo dev server on
port 8081) instead of `apiClient` (uses `API_BASE_URL` pointing to port 3001).
**Fix:** Always use `apiClient` for API calls:
```ts
// Wrong: const res = await fetch("/api/categories");
// Right: const data = await apiClient<Type[]>("/api/categories");
```
**Prevention:** All API calls must use `apiClient` from `../../lib/apiClient`. It handles
auth tokens, refresh, error parsing, and the correct base URL. Never use raw `fetch`.

### 2.2 Cache not invalidated after mutation
**Symptom:** Newly created entity doesn't appear in list until manual refresh.
**Root cause:** TanStack Query caches the `["products"]` query. After POST, the cache
is stale but never invalidated.
**Fix:** Invalidate the query after successful mutation:
```ts
const queryClient = useQueryClient();
// After POST:
queryClient.invalidateQueries({ queryKey: ["products"] });
```
**Prevention:** Every mutation that creates/updates/deletes must invalidate the
relevant TanStack Query cache key.

---

## 3. Navigation & Stack Management

### 3.1 Double header bars
**Symptom:** Stack navigator header ("Add Product") + Wizard internal header
("Add New Product") both visible.
**Root cause:** The stack layout's `new` route had a visible header, and the Wizard
also renders its own header.
**Fix:** Set `headerShown: false` on the wizard route in `_layout.tsx`.
**Prevention:** Wizard screens should always hide the stack header. The wizard
provides its own header with back/close/title.

### 3.2 `router.replace` loses back button & tab behavior
**Symptom:** After wizard → product detail, no back button and catalog tab doesn't work.
**Root cause:** `router.replace` within a stack with `headerShown: false` on the
previous screen doesn't properly initialize the new screen's header/navigation state.
**Fix:** Use `router.dismissTo` + `router.push` pattern:
```ts
router.dismissTo('/(admin)/products');  // remove wizard, return to catalog
router.push(`/(admin)/products/${id}`);  // push to detail
```
Result: stack becomes `[catalog, detail]` — back button works, tab works.
**Prevention:** After any wizard completes, use dismissTo + push, never replace.

### 3.3 Header back button goes to catalog instead of previous step
**Symptom:** Clicking ← on step 2 dismisses the entire wizard.
**Root cause:** Header back button was hardcoded to `onClose`.
**Fix:** Conditional behavior:
```ts
onPress={currentStep > 0 ? handleBack : onClose}
```
**Prevention:** The wizard header back button should go back one step when not on
the first step. Only the close (×) button always dismisses.

---

## 4. Form & Validation

### 4.1 Validation errors invisible
**Symptom:** Clicking Continue with empty fields shows no error.
**Root cause:** Zod validation caught errors but only showed `Alert.alert()` — no
inline field-level errors.
**Fix:** Three changes needed:
1. Add `fieldErrors: Record<string, string>` to `WizardStep` component props
2. Parse Zod issues into field-level map in `handleNext`:
```ts
const errors: Record<string, string> = {};
for (const issue of result.error.errors) {
  const field = issue.path[0] as string;
  if (!errors[field]) errors[field] = issue.message;
}
setFieldErrors(errors);
```
3. Pass `error={fieldErrors.name}` to `FormInput` components
**Prevention:** All step components must accept `fieldErrors` and pass them to
`FormInput`/`FormSelect`. No `Alert.alert` for validation.

### 4.2 Numeric fields accept any text
**Symptom:** Can type letters in price/tax rate fields.
**Root cause:** `keyboardType="decimal-pad"` doesn't filter input — it only affects
the keyboard appearance on mobile. On web, it has no effect.
**Fix:** Filter input in the onChange handler:
```ts
const filtered = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
```
**Prevention:** Always add input filtering for numeric fields. Keyboard type alone
is not sufficient.

### 4.3 Form state lost when navigating back
**Symptom:** Going back from step 2 to step 1 clears all entered data.
**Root cause:** Step components remount fresh with `useState("")` when navigating
back. The wizard accumulates data in `dataRef` but doesn't pass it back.
**Fix:** Add `initialData` prop to step components, populated from `dataRef.current`.
Step components initialize state from it:
```ts
const [name, setName] = useState(initialData.name ?? "");
```
**Prevention:** Every step component MUST accept `initialData` and use it to
initialize all state fields. The Wizard passes `initialData={dataRef.current}`.

---

## 5. Layout & UI

### 5.1 Footer buttons hidden behind tab bar
**Symptom:** Continue/Submit button not visible.
**Root cause:** Admin layout tab bar is `position: absolute` at the bottom. The
wizard's `flex-1` view extends behind it.
**Fix:** Add bottom padding to the wizard container using `useSafeAreaInsets`:
```ts
const tabBarClearance = insets.bottom + 70;
<View className="flex-1 bg-canvas" style={{ paddingBottom: tabBarClearance }}>
```
**Prevention:** Any full-screen content inside the admin tabs must account for the
absolute-positioned tab bar (~70px + safe area).

### 5.2 RefreshControl spinner invisible
**Symptom:** Pull-to-refresh works but shows no visual indicator.
**Root cause:** `tintColor="#848281"` (ash) is nearly invisible against `#fbfaf9`
(canvas) background.
**Fix:** Use a darker, higher-contrast color:
```ts
tintColor="#343433"  // charcoal — visible on light background
colors={["#343433"]} // Android
```
**Prevention:** Always test spinner colors against the actual background color.

### 5.3 No gap between search bar and scroll content
**Symptom:** Products touch the search bar when scrolling up.
**Root cause:** `FilterToolbar` renders the search bar and children (ScrollView)
adjacent with no spacing.
**Fix:** Add bottom padding to the search bar container:
```tsx
<View className="px-4 pt-4 pb-3">  {/* pb-3 = 12px gap */}
```
**Prevention:** Always add visual separation between fixed toolbars and scrollable
content.

### 5.4 Step indicator doesn't scale
**Symptom:** Numbered circles with labels take too much space for 4+ steps.
**Root cause:** Original design used numbered circles + text labels per step.
**Fix:** Use segmented pills — one pill per step, equal width, filled/empty state.
No text labels. Works for any number of steps:
```tsx
<View className="flex-row gap-1.5">
  {steps.map((step, index) => (
    <View className={`flex-1 h-1.5 rounded-full ${index <= currentStep ? 'bg-midnight' : 'bg-stone-border'}`} />
  ))}
</View>
```
**Prevention:** The `WizardStepIndicator` component handles any number of steps.
No changes needed per flow.

---

## 6. Server & Database

### 6.1 Foreign key collation mismatch
**Symptom:** `ER_FK_INCOMPATIBLE_COLUMNS` when creating categories table.
**Root cause:** Raw SQL migration used `utf8mb4_unicode_ci` but existing tables
created by Drizzle use `utf8mb4_0900_ai_ci` (MySQL 8 default).
**Fix:** Match the existing table collation in migration SQL.
**Prevention:** Always check the actual charset/collation of existing tables before
writing migrations. Use `SHOW CREATE TABLE` to verify.

### 6.2 Zod field added but no DB column
**Symptom:** `taxRate` passed validation but PATCH handler threw "No values to set".
**Root cause:** Added `taxRate` to Zod schema without adding the corresponding DB
column or updating the handler's field destructuring.
**Fix:** Either add the DB column + migration + handler support, or keep the schema
and handler in sync with the DB schema.
**Prevention:** When adding a field to the Zod schema, check: (1) DB column exists,
(2) migration added, (3) POST handler destructures it, (4) PATCH handler handles it.

### 6.3 Don't create unnecessary APIs
**Symptom:** Built a separate `/api/categories` CRUD API.
**Root cause:** Categories are product metadata, not an independent entity.
**Fix:** Categories derive from products — extract unique values from existing
products. No separate API needed.
**Prevention:** Before creating a new API endpoint, ask: can this data be derived
from existing entities?

---

## 7. Component Design

### 7.1 Build generic, not specific
**Symptom:** Built product-specific wizard components that can't be reused.
**Root cause:** Started with product-specific step components before the generic shell.
**Fix:** Build order should be:
1. Generic Wizard shell (step counter, nav, validation, error handling)
2. Shared form primitives (FormInput, FormSelect, ImageUploader, SearchablePillSelector)
3. Flow-specific plug-in (step components + schemas + submit handler)
**Prevention:** Always build the generic layer first. The Wizard, WizardStepIndicator,
and all form primitives are already reusable — just configure them per flow.

### 7.2 Extract reusable patterns early
**Symptom:** Built inline category picker, then had to extract it later.
**Fix:** `SearchablePillSelector` is now a reusable component — accepts `items`,
`value`, `onChange`, and handles search/filter/create. Use it for any
string-based multi-select in future flows.
**Prevention:** When building a UI pattern that could appear in multiple places,
extract it into `client/src/components/shared/` immediately.

---

## 8. Testing

### 8.1 Tests fail when DB table doesn't exist
**Symptom:** 500 errors in categories tests.
**Root cause:** Migration wasn't run against the dev database before running tests.
**Fix:** Run `npx tsx src/db/migrate.ts` before `npx vitest`.
**Prevention:** Document the migration step in the test setup or add it to a
`beforeAll` / global setup.

### 8.2 Don't test implementation details
**Symptom:** Tests became brittle when implementation changed (taxRate column).
**User directive:** "Focus more on end to end tests, do not test implementation
level details, as those might change. We only test behavioral requirements."
**Prevention:** Write tests against the API contract (status codes, response shapes,
behavior) — not internal DB columns, middleware chains, or file structure.

---

## Quick Checklist for Future Onboarding Flows

- [ ] Metro `watchFolders` configured? (one-time)
- [ ] No `.js` extensions in shared package imports? (one-time, done)
- [ ] All API calls use `apiClient`, never raw `fetch`?
- [ ] `queryClient.invalidateQueries` after every mutation?
- [ ] `headerShown: false` on the wizard route in `_layout.tsx`?
- [ ] Wizard `onComplete` uses `dismissTo` + `push`, not `replace`?
- [ ] Step components accept `initialData` and restore state from it?
- [ ] Step components accept `fieldErrors` and pass to form inputs?
- [ ] Numeric fields have input filtering in onChange?
- [ ] Wizard container has `paddingBottom` for tab bar clearance?
- [ ] No separate API for derived data (extract from existing entities)?
- [ ] Generic components used before building flow-specific ones?
- [ ] DB migration run before tests?
- [ ] Tests verify behavior, not implementation?

---

## 9. Inline Editing on Detail Pages

### 9.1 `Alert.alert` doesn't work reliably on web
**Symptom:** Clicking Cancel/Save/Back buttons does nothing — no dialog appears.
**Root cause:** React Native's `Alert.alert` has inconsistent behavior on web.
It may silently fail or not render, especially inside event handlers triggered by
navigation transitions.
**Fix:** Use `window.confirm` on web, `Alert.alert` on native:
```tsx
const promptUnsavedChanges = (onDiscard: () => void, onSave: () => void) => {
  if (Platform.OS === "web") {
    const ok = window.confirm("You have unsaved changes. Discard them?");
    if (ok) onDiscard();
  } else {
    Alert.alert("Unsaved Changes", "What would you like to do?", [
      { text: "Discard", style: "destructive", onPress: onDiscard },
      { text: "Keep Editing", style: "cancel" },
      { text: "Save", onPress: onSave },
    ]);
  }
};
```
**Prevention:** Always use `Platform.OS === "web"` check for confirmation dialogs
in edit guards. `window.confirm` is synchronous and reliable on web.

### 9.2 Header back button on web uses a link, not `beforeRemove`
**Symptom:** Clicking the stack header back button navigates away without firing
the `beforeRemove` event or showing the unsaved changes prompt.
**Root cause:** Expo Router renders the header back button as an `<a>` tag (link)
on web, which performs client-side navigation via the browser history API.
This bypasses React Navigation's `beforeRemove` event entirely.
**Fix:** Always override `headerLeft` with a custom `TouchableOpacity` that
calls your own back handler. When editing, the back handler exits edit mode
first (prompting if dirty). When not editing, it navigates back normally:
```tsx
navigation.setOptions({
  headerLeft: () => (
    <TouchableOpacity onPress={handleBackPress}>
      <Ionicons name="chevron-back" size={24} color="#343433" />
    </TouchableOpacity>
  ),
});
```
**Prevention:** Every detail page with inline editing MUST override `headerLeft`
with a custom back button. Never rely on the default stack back button to
handle unsaved changes on web.

### 9.3 `beforeRemove` should prevent ALL navigation in edit mode
**Symptom:** User navigates away while editing and loses changes.
**Root cause:** The `beforeRemove` listener only prevented navigation when
there were changes (`hasChanges`). But the correct behavior is: when in edit
mode, back should ALWAYS exit edit mode first, never navigate away directly.
**Fix:** Always `e.preventDefault()` when `isEditing`, regardless of whether
there are changes. The first back-press exits edit mode. The second
back-press navigates back:
```tsx
navigation.addListener("beforeRemove", (e) => {
  if (!isEditing) return; // not editing, let it through
  e.preventDefault();     // always block — exit edit mode first
  if (!hasChanges) {
    setIsEditing(false);
  } else {
    promptUnsavedChanges(() => setIsEditing(false), saveChanges);
  }
});
```
**Prevention:** Back button in edit mode = "exit editing." Only after exiting
edit mode can the user navigate away.

### 9.4 `saveChanges` should accept a navigation action for after save
**Symptom:** After saving changes and navigating back, the stale data is shown.
**Root cause:** Save and navigate-back are two separate operations. If save
succeeds but navigation fails, the user is stuck. If navigation happens
before the save completes, the user sees stale data.
**Fix:** Make the save function accept an optional `actionToDispatch` parameter.
After save + cache invalidation succeeds, dispatch the pending navigation:
```tsx
const saveChanges = async (actionToDispatch?: any) => {
  if (!validateForm()) return false;
  await apiClient(...);
  queryClient.invalidateQueries({ queryKey: ["products"] });
  setIsEditing(false);
  if (actionToDispatch) navigation.dispatch(actionToDispatch);
  return true;
};
```
**Prevention:** Save functions on detail pages should accept an optional
navigation action to dispatch after successful save. This decouples the save
logic from navigation logic.

### 9.5 Client-side validation needed even with Zod on server
**Symptom:** User submits empty name or negative price, gets a server error
instead of inline feedback.
**Root cause:** The Zod schema validates at the server, but the detail page
didn't have client-side validation. Users should see errors inline before
the save is attempted.
**Fix:** Add a `validateForm` function that runs before `saveChanges`.
Track per-field errors in state and pass them to `FormInput.error`.
**Prevention:** Every editable detail page needs client-side validation
with inline error display, even when the server has Zod validation.

### 9.6 Edit state must be properly initialized and cleaned up
**Symptom:** Entering edit mode shows stale values, or exiting loses state.
**Root cause:** `enterEditMode` must populate ALL edit state from the current
product values. `setIsEditing(false)` must also clear errors state.
**Fix:**
```tsx
const enterEditMode = () => {
  setEditName(product.name);
  setEditDescription(product.description ?? "");
  // ... all fields
  setErrors({});
  setIsEditing(true);
};
```
**Prevention:** Create a single `enterEditMode` function that resets ALL state.
Create a single "exit edit mode" path that clears errors.

### 9.7 `navigation` object must be in hook dependency arrays
**Symptom:** `beforeRemove` listener uses stale `hasChanges` or `saveChanges`.
**Root cause:** `useEffect` with `navigation.addListener` captures values in
closure. If dependencies aren't listed, the listener runs with stale data.
**Fix:** Include `isEditing`, `hasChanges`, `saveChanges`, and `navigation`
in the dependency array:
```tsx
useEffect(() => {
  if (!isEditing) return;
  const unsub = navigation.addListener("beforeRemove", handler);
  return unsub;
}, [isEditing, hasChanges, saveChanges, navigation]);
```
**Prevention:** Always list all referenced values as useEffect dependencies
when using `navigation.addListener`.

### 9.8 Long-press delete on catalog cards
**Symptom:** No way to quickly delete a product from the catalog.
**Fix:** Add `onLongPress` prop to `ProductCard`. On catalog page, wire it
to a delete confirmation (admin only):
```tsx
<ProductCard
  onLongPress={isAdmin ? () => handleProductLongPress(product) : undefined}
/>
```
**Prevention:** All entity cards (ProductCard, OrderCard, ShopCard, etc.)
should accept an `onLongPress` prop for quick admin actions.

### 9.9 Edit/delete buttons visible only to admin
**Symptom:** Salesman sees edit/delete buttons and gets 403 errors.
**Root cause:** Edit/delete buttons rendered without role check.
**Fix:** Guard all admin actions with `isAdmin` check from auth store:
```tsx
const isAdmin = useAuthStore((s) => s.user?.role === "admin");
{isAdmin && <EditButton />}
```
**Prevention:** Every admin-only UI element must be wrapped in a role check.
Backend already has `authorize('admin')` as a second line of defense.

---

## Quick Checklist for Inline Editing on Detail Pages

- [ ] `headerLeft` overridden with custom back button?
- [ ] Back button exits edit mode first (prompting if dirty)?
- [ ] `Platform.OS === "web"` check for confirmation dialogs?
- [ ] `beforeRemove` always prevents navigation when editing?
- [ ] `saveChanges` accepts optional `actionToDispatch`?
- [ ] Client-side `validateForm` with inline errors?
- [ ] `enterEditMode` resets all state including errors?
- [ ] `setIsEditing(false)` also clears errors?
- [ ] `useEffect` deps include `isEditing`, `hasChanges`, `saveChanges`?
- [ ] Admin-only UI guarded with `isAdmin` role check?
- [ ] `onLongPress` prop on entity cards for quick actions?
- [ ] `queryClient.invalidateQueries` after every save/delete?
