# BEST_PRACTICES.md — Verified Best Practices Reference

> Companion to `GOTCHAS.md` (which holds concrete violations found in this repo).
> This file collects **verified, version-specific best practices** for the stack
> in use, sourced from official documentation. Every entry cites its source URL.
>
> **Read `GOTCHAS.md` for what's wrong in this repo; read this for how to do it right.**
> Versions matter: Expo SDK 56 / RN 0.85 / reanimated 4 / react-query v5 / zustand v5 /
> RHF v7 / zod v3 / drizzle 0.44 / Express 5. Some practices differ from older
> versions — trust the cited versioned docs, not memory.

## How to use

- Before writing code for a library, check its section here + the matching GOTCHAS.md section.
- Adding entries: research from official docs only, cite the URL, note the version it applies to.

## Entry format

```md
### <Gotcha-style title>

- **Library:** ...
- **Practice / anti-pattern:** concrete statement
- **Source:** official doc URL
- **Why:** one-line rationale
```

Severity: **SEV-1** = security/data-loss, **SEV-2** = correctness/perf, **SEV-3** = hygiene/DX.

---

## React Native / Expo (SDK 56, RN 0.85)

_All entries verified against Expo SDK 56 versioned docs (docs.expo.dev/versions/v56.0.0), RN 0.85 docs, Reanimated 4.x, NativeWind v5 preview, Tailwind v4 (Aug 2026)._

### Architecture & separation of concerns

#### [SEV-2] Keep state minimal — distinguish client state from server state

- **Practice:** State is only for data that changes over time in the component; server data lives in react-query's cache (own lifecycle), client/UI state in zustand. Never mirror server data into zustand stores.
- **Source:** https://reactnative.dev/docs/state · https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
- **Why:** Duplicated server state goes stale and forces manual sync.

#### [SEV-2] Protected-route architecture: `(app)` route group + layout guard + SecureStore session

- **Practice:** All routes always defined; protect with root-level session Context (token persisted via `expo-secure-store` on native), a `(app)/_layout.tsx` guard, and `SplashScreen.preventAutoHideAsync()` until auth state loads (prevents flash of protected UI). Newer API: `Stack.Protected guard={...}` redirects to the anchor route and auto-redirects if the guard flips while the screen is active.
- **Source:** https://docs.expo.dev/router/advanced/authentication/ · https://docs.expo.dev/router/advanced/protected/
- **Why:** Route groups (`(name)`) don't add URL segments — clean URLs, enforced guards.

#### [SEV-3] Route groups vs directories — know what becomes a URL

- **Practice:** A directory in parentheses is a route group and "will not count as part of the URL"; plain directories do. First screen resolves from the first `index.tsx` matching `/`.
- **Source:** https://docs.expo.dev/router/basics/core-concepts/
- **Why:** Misplaced files silently change deep-link URLs and break `router.push` paths.

#### [SEV-3] Split code by platform with `.android.tsx` / `.native.tsx`, not `Platform.OS` if-blocks

- **Practice:** Metro resolves `BigButton.android.tsx`/`.ios.tsx` automatically at import; use `Platform.select` only for small differences; `.native.tsx` covers both native platforms.
- **Source:** https://reactnative.dev/docs/platform-specific-code
- **Why:** Platform files keep platform logic out of shared components.

### Performance

#### [SEV-1] FlatList: `getItemLayout`, `windowSize`, `maxToRenderPerBatch`, memoized rows — or FlashList

- **Practice:** Fixed-height rows → `getItemLayout` skips async measurement ("a very desirable optimization"); `windowSize` default 21 viewports trades memory for blank-area risk; `initialNumToRender` (default 10) should cover the first viewport; rows `memo()`'d with custom comparator; `renderItem` must NOT be an anonymous inline function — hoist it and wrap in `useCallback`. `removeClippedSubviews` defaults true on Android (known bugs on iOS).
- **Source:** https://reactnative.dev/docs/optimizing-flatlist-configuration · https://reactnative.dev/docs/performance
- **Why:** Every inline `renderItem` re-created per render defeats row memoization and re-renders the whole window on scroll.

#### [SEV-1] `InteractionManager` is DEPRECATED in current RN — use `requestIdleCallback`

- **Practice:** RN docs mark InteractionManager 🗑️ Deprecated: "Avoid long-running work and use `requestIdleCallback` instead." Old AI-generated code still uses `runAfterInteractions`.
- **Source:** https://reactnative.dev/docs/interactionmanager
- **Why:** Deprecated APIs also behave worse on the New Architecture.

#### [SEV-2] Re-render storms: JS thread frame budget is 16.67ms

- **Practice:** All business logic, API calls and touch events run on the JS thread; a 200ms re-render of an expensive subtree drops ~12 frames. Use `useCallback` for handlers and `memo()` to skip re-renders.
- **Source:** https://reactnative.dev/docs/performance · https://react.dev/reference/react/useCallback
- **Why:** Mid-range Android devices are exactly where JS-thread stalls show up as jank.

#### [SEV-2] `console.log` is a production bottleneck — drop it in release

- **Practice:** "When running a bundled app, these statements can cause a big bottleneck in the JavaScript thread." Expo supports `drop_console: true` in the Terser minifier config (metro.config.js).
- **Source:** https://reactnative.dev/docs/performance · https://docs.expo.dev/guides/minify/
- **Why:** Logging in list renders or hot paths destroys scroll FPS on low-end hardware.

#### [SEV-3] New Architecture is mandatory on this stack — stop writing legacy-arch code

- **Practice:** SDK 55+ runs "entirely on the New Architecture… always enabled and cannot be disabled"; RN 0.82 removed the opt-out; legacy arch frozen June 2025. `newArchEnabled` is ignored in app config on this SDK — remove it. Validate with `npx expo-doctor`.
- **Source:** https://docs.expo.dev/guides/new-architecture/ · https://reactnative.dev/docs/the-new-architecture/landing-page
- **Why:** Any dependency/snippet requiring the old bridge is a landmine.

### Navigation (expo-router)

#### [SEV-1] Deep linking: schemes are automatic — set `scheme` in app config

- **Practice:** Add `"scheme": "myapp"` to app config; without it `android.package`/`ios.bundleIdentifier` become the default schemes. Test with `npx uri-scheme open <scheme>://somepath/details --android`. For production links, Android App Links / Universal Links are recommended over custom schemes.
- **Source:** https://docs.expo.dev/linking/into-your-app/ · https://docs.expo.dev/router/introduction/
- **Why:** Sales reps paste links in chat apps; a wrong/unset scheme silently kills those flows.

#### [SEV-2] `Stack.Protected` removes history entries when the guard flips

- **Practice:** "When a screen's guard is changed from true to false, all of its history entries will be removed" — good for logout (prevents back-navigation into protected screens), but the anchor/redirect target must exist (usually `index`).
- **Source:** https://docs.expo.dev/router/advanced/protected/
- **Why:** Back button after logout must not resurrect protected screens.

### State management (zustand v5)

#### [SEV-1] Use selectors — and `useShallow` when the selector returns an object/array

- **Practice:** Selector output is compared with `Object.is`; `useStore((s) => Object.keys(s))` re-renders even when values are shallow-equal — wrap multi-value selectors in `useShallow` from `zustand/react/shallow`. Single-field selectors are the default safe pattern (repo CLAUDE.md mandates this).
- **Source:** https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow
- **Why:** An object-literal selector re-renders on every store change — a classic silent perf killer.

#### [SEV-2] Vanilla stores: `createStore` from `zustand/vanilla`, consumed via `useStore(store, selector)`

- **Practice:** `createStore` "creates a vanilla store that exposes API utilities `setState`, `getState`"; attach to React with `useStore(store, selectorFn)`.
- **Source:** https://zustand.docs.pmnd.rs/reference/apis/create-store · https://zustand.docs.pmnd.rs/reference/hooks/use-store
- **Why:** Lets services/modules outside React read state without hook rules (e.g., the token/API layer).

#### [SEV-2] `persist` middleware: use `createJSONStorage` + `partialize`; do NOT persist tokens through it

- **Practice:** Default storage is `localStorage`; on RN supply `createJSONStorage(() => AsyncStorage)`; use `partialize` to whitelist fields; bump `version` + `migrate` on shape changes. Tokens belong in `expo-secure-store`, not a persist store.
- **Source:** https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data
- **Why:** AsyncStorage is unencrypted plaintext on disk — persisting JWTs there defeats the security model.

#### [SEV-2] persist does no runtime validation — corrupt/tampered storage poisons state

- **Practice:** "Corrupt, stale, or tampered data will not be caught at runtime"; docs recommend "a custom PersistStorage that validates the persisted value, for example using a schema validation library". Use `version` to invalidate incompatible persisted shapes.
- **Source:** https://zustand.docs.pmnd.rs/reference/middlewares/persist
- **Why:** A stale schema in storage silently produces undefined fields and crashes.

#### [SEV-3] Transient updates: subscribe outside React with `subscribeWithSelector`

- **Practice:** `store.subscribe((state) => state.position.x, listener)` drives external systems (animations, logs) without React re-renders.
- **Source:** https://zustand.docs.pmnd.rs/reference/middlewares/subscribe-with-selector
- **Why:** High-frequency updates (gestures, location) shouldn't trigger component renders.

### Data fetching (@tanstack/react-query v5)

#### [SEV-1] Query keys are arrays, hashed deterministically — array ORDER matters, object key order does not

- **Practice:** "Query keys have to be an Array at the top level"; hashing is deterministic — `['todos', {status}]` equals any object key order, but array item order changes the hash. Keep keys in a factory (shared constants) so invalidation always matches.
- **Source:** https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
- **Why:** Invalidation misses (and silent cache duplication) are the #1 react-query bug class.

#### [SEV-1] Invalidate from mutations — forgetting it means stale UI forever

- **Practice:** "Usually when a mutation succeeds, it's VERY likely that related queries need to be invalidated and possibly refetched" — `onSuccess: () => queryClient.invalidateQueries({ queryKey: [...] })`. Return the promise so `isPending` stays true until refetch completes; use `Promise.all([...])` for multiple keys.
- **Source:** https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations
- **Why:** A sales rep creates an order and the list still shows the old state; not returning the promise causes flicker/races.

#### [SEV-2] `staleTime` defaults to 0 — set it deliberately; v5 adds `'static'`

- **Practice:** Defaults are "aggressive": queries refetch on mount/window focus/reconnect whenever stale. Set `staleTime` (e.g., `2 * 60 * 1000` for reference data); `'static'` disables even manual invalidation (feature flags/roles loaded at boot) — note `invalidateQueries()` has NO effect on `'static'` (stricter than `Infinity`). `gcTime` default is 5 min.
- **Source:** https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults · https://tanstack.com/query/latest/docs/framework/react/guides/caching
- **Why:** On flaky field networks, default refetching burns battery/data and causes flicker.

#### [SEV-2] v5 API differences: `throwOnError`, not `errorBoundary`; `onSuccess` removed from queries

- **Practice:** v5 renamed `useErrorBoundary` → `throwOnError` and removed `onSuccess`/`onError`/`onSettled` from `useQuery` (still valid on mutations). AI training data is full of v4-era `useQuery({ onSuccess })` — it silently does nothing in v5.
- **Source:** https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5
- **Why:** Code that compiles but never fires callbacks is the worst kind of regression.

#### [SEV-2] Handle mutation errors explicitly; disable with `enabled: false` (not `skipToken`)

- **Practice:** Mutation states `isPending`/`isError`/`isSuccess`; use `mutation.reset()` to clear error/data; `onError`/`onSettled` for side effects (rolling back optimistic updates). Disable queries via `enabled: !!filter` — "refetch from useQuery will not work with skipToken… use enabled: false instead".
- **Source:** https://tanstack.com/query/latest/docs/framework/react/guides/mutations · https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries
- **Why:** Unhandled mutation errors = silent failures or stuck loading buttons.

#### [SEV-2] Retries: failed queries retry 3× with exponential backoff by default

- **Practice:** "Queries that fail are silently retried 3 times, with exponential backoff delay" — tune via `retry`/`retryDelay` (e.g., `retry: false` for auth 401s).
- **Source:** https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
- **Why:** Default retries amplify load on erroring endpoints and delay error UI.

#### [SEV-3] Offline: `networkMode: 'offlineFirst'` runs the queryFn once then pauses retries

- **Practice:** `networkMode` defaults to `'online'`; `'offlineFirst'` runs the queryFn once then pauses retries. RN apps need an explicit offline strategy (persistQueryClient + async storage persister).
- **Source:** https://tanstack.com/query/latest/docs/framework/react/guides/network-mode
- **Why:** Field salesmen work in dead zones — the app must not hard-fail off-network.

### Security on device

#### [SEV-1] Tokens → `expo-secure-store`, NEVER AsyncStorage

- **Practice:** SecureStore encrypts values (Android: SharedPreferences encrypted with Keystore; iOS: Keychain). The official Expo Router auth guide persists session tokens with `expo-secure-store`. Note: Android data is NOT preserved across uninstall; iOS Keychain may persist across reinstall; `requireAuthentication` blocks the JS thread while prompting (and isn't supported in Expo Go without NSFaceIDUsageDescription).
- **Source:** https://docs.expo.dev/versions/v56.0.0/sdk/securestore/ · https://docs.expo.dev/router/advanced/authentication/
- **Why:** JWT in AsyncStorage = plaintext credential on disk, extractable via backup/root.

#### [SEV-1] Android 9+ blocks cleartext HTTP by default — HTTPS only

- **Practice:** "Starting with Android 9 (API level 28), cleartext support is disabled by default" — any `http://` API URL fails on modern Android without a network-security-config opt-in.
- **Source:** https://developer.android.com/training/articles/security-config
- **Why:** Hardcoded `http://` endpoints (common AI mistake) break silently in release builds.

#### [SEV-2] Obfuscation is not security — secrets in the bundle are plaintext

- **Practice:** Expo: "Do not store sensitive info, such as private keys, in `EXPO_PUBLIC_` variables. These variables will be visible in plain-text in your compiled application." Terser minification is not obfuscation; Hermes `.hbc` bytecode is still decompilable.
- **Source:** https://docs.expo.dev/guides/environment-variables/ · https://docs.expo.dev/guides/minify/ · https://reactnative.dev/docs/hermes
- **Why:** API secrets must live server-side; anything in the bundle is recoverable.

#### [SEV-2] Google Maps API key: restrict by package name + SHA-1, separate key per platform

- **Practice:** Google: "Restrict API keys… selecting 'Android apps' and adding the package name and SHA-1 certificate fingerprint. Use separate keys for each app and platform." Wire via the react-native-maps config plugin `androidGoogleMapsApiKey` (read from `.env`), never hardcode.
- **Source:** https://developers.google.com/maps/documentation/android-sdk/get-api-key · https://docs.expo.dev/versions/v56.0.0/sdk/map-view/
- **Why:** An unrestricted key leaks quota and costs; a hardcoded key gets extracted from the APK.

#### [SEV-3] SecureStore + Android Auto Backup — exclude or restore breaks

- **Practice:** Auto Backup must exclude SecureStore shared prefs ("it's impossible to decrypt them after restoring the backup"); the config plugin does this automatically unless you have custom backup rules (`configureAndroidBackup`).
- **Source:** https://docs.expo.dev/versions/v56.0.0/sdk/securestore/
- **Why:** Restored backups can crash token reads / log users out unexpectedly.

### Animations (Reanimated 4)

#### [SEV-1] Reduced motion is an accessibility requirement — `ReduceMotion.System` is the default, but verify every custom animation

- **Practice:** Reanimated 4: all animations default to `ReduceMotion.System` (auto-disabled when the OS setting is on); `useReducedMotion()` returns the setting as a boolean to branch custom logic (e.g., swap `BounceIn` → `FadeIn`). RN's `AccessibilityInfo.isReduceMotionEnabled()` is the non-reanimated equivalent (Android also honors Developer-options "Animation off").
- **Source:** https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/ · https://reactnative.dev/docs/accessibilityinfo
- **Why:** Repo CLAUDE.md mandates it; accessibility review treats it as a defect.

#### [SEV-1] Reanimated 4 works ONLY on the New Architecture and needs `react-native-worklets`

- **Practice:** "Reanimated 4.x works only with the React Native New Architecture (Fabric)… requires an installation of the `react-native-worklets` dependency… must be installed separately." (Repo has `react-native-worklets ^0.8.3` — keep them version-matched.) Reanimated 3 APIs from old training data are not drop-in.
- **Source:** https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/
- **Why:** Missing/mismatched worklets package = runtime "workletization failed" crashes.

#### [SEV-2] Worklets run on the UI thread — never call JS-only APIs from them

- **Practice:** Worklets are "short-running JavaScript functions that can be run on the UI thread"; shared values synchronize between threads via `.value`; anything touching the JS thread goes through `runOnJS`. Animations driven from the JS thread (old `Animated` with `useNativeDriver: false`) drop frames on mid-range Android.
- **Source:** https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary/
- **Why:** Calling API/console-heavy code inside worklets blocks the UI thread.

### Forms (react-hook-form v7 + zod)

#### [SEV-2] Prefer `register` for plain TextInputs; use `Controller`/`useController` only for custom controlled components

- **Practice:** `register` is the uncontrolled default (fewer re-renders); `useController` "powers `Controller`… useful for creating reusable Controlled input" — needed for third-party components (bottom-sheet pickers, switches) that don't forward refs. RN docs note: "React Native: compatible with Controller / Custom register or using Controller" — RN inputs have no HTML ref/onChange contract.
- **Source:** https://www.react-hook-form.com/docs/usecontroller/ · https://react-hook-form.com/docs/useform
- **Why:** Every extra Controller re-renders on each keystroke; forms with many fields jank on low-end devices.

#### [SEV-2] Schema-first validation: `zodResolver(schema)` — define the schema ONCE, share with the shared package

- **Practice:** `useForm({ resolver: zodResolver(schema) })` with the zod schema defined outside the component (module-level); type the form `useForm<z.input<typeof schema>, any, z.output<typeof schema>>` so input/output types flow from the schema.
- **Source:** https://github.com/react-hook-form/resolvers · https://www.react-hook-form.com/get-started/
- **Why:** Recreating schemas per render defeats resolver memoization; duplicating schemas client/server guarantees drift.

#### [SEV-3] Form mechanics: `mode`/`reValidateMode` defaults, `defaultValues` vs `values`, reset after submit

- **Practice:** `mode` defaults to `onSubmit`, `reValidateMode` to `onChange`; `onTouched` balances UX vs re-renders. `defaultValues` is "cached" (mutating after mount does nothing); `values` is "reactive" (syncs external changes — use for server-loaded records, with `resetOptions` guards). Call `reset()` with the server's canonical response after submit; render `formState.errors` inline; use `setError` for server-side failures.
- **Source:** https://react-hook-form.com/docs/useform
- **Why:** Without reset, stale values/errors persist into the next record edit; alerts per keystroke destroy the flow for reps in the field.

### Platform-specific (Android-first)

#### [SEV-1] Android hardware back: `BackHandler` is Android-only; subscriptions run in reverse order

- **Practice:** Last-registered listener runs first; return `true` to consume, `false` to bubble; if none returns true the app exits. BackHandler does NOT fire while a RN `Modal` is open (use `onRequestClose`). Expo Router/React Navigation handles back automatically for navigation — only add handlers for custom in-screen states (bottom sheet open, form discard confirm).
- **Source:** https://reactnative.dev/docs/backhandler
- **Why:** Android is the primary platform — double-back-to-exit and sheet-dismiss flows are core UX.

#### [SEV-1] Safe areas: RN's `SafeAreaView` is deprecated — use `react-native-safe-area-context`

- **Practice:** RN docs mark `SafeAreaView` 🗑️ Deprecated: "Use react-native-safe-area-context instead." Wrap in `SafeAreaProvider`, then `SafeAreaView` or `useSafeAreaInsets`. (Repo has `react-native-safe-area-context ~5.7.0`.)
- **Source:** https://reactnative.dev/docs/safeareaview · https://docs.expo.dev/versions/v56.0.0/sdk/safe-area-context/
- **Why:** Gesture bars/notches differ wildly across mid-range Androids; insets must come from the context provider.

#### [SEV-2] Keyboard on Android: `softwareKeyboardLayoutMode: 'resize'` handles it natively — don't blanket-wrap in KeyboardAvoidingView

- **Practice:** App config `android.softwareKeyboardLayoutMode` (`resize`|`pan`) controls window behavior. Caveat: `androidStatusBar.translucent: true` + `resize` "may cause unexpected keyboard behavior… you will have to use KeyboardAvoidingView". RN `Keyboard` events: on Android only `keyboardDidShow`/`keyboardDidHide` fire.
- **Source:** https://docs.expo.dev/versions/v56.0.0/config/app/ · https://reactnative.dev/docs/keyboard
- **Why:** Double-handling the keyboard (window resize + KeyboardAvoidingView padding) is a classic Android bug source.

#### [SEV-1] Permissions: request at the right time, with the right rationale; remove unused ones

- **Practice:** expo-location: foreground = `requestForegroundPermissionsAsync`; background requires BOTH foreground AND background permission on Android + config-plugin flags `isAndroidBackgroundLocationEnabled`/`isAndroidForegroundServiceEnabled` (needed on Android 14+) + a top-level `TaskManager.defineTask`. expo-image-picker: launching the library needs NO permission on Android; the default config adds `RECORD_AUDIO` to the manifest (kill it with `microphonePermission: false` or `android.blockedPermissions`). Google may reject apps holding dangerous permissions without valid reasons.
- **Source:** https://docs.expo.dev/versions/v56.0.0/sdk/location/ · https://docs.expo.dev/versions/v56.0.0/sdk/imagepicker/ · https://docs.expo.dev/guides/permissions/
- **Why:** Background location is a Play Store policy minefield; unused mic permission is a rejection risk.

#### [SEV-2] Fonts: prefer the `expo-font` config plugin (embed at build time) over runtime `useFonts`

- **Practice:** SDK 56 docs: the config plugin "allows you to embed font files at build time which is more efficient than `useFonts` or `loadAsync`"; use `useFonts` only when the plugin can't (e.g., dynamic fonts). If loading at runtime, gate UI on `loaded` to avoid invisible text.
- **Source:** https://docs.expo.dev/versions/v56.0.0/sdk/font/
- **Why:** Build-time embedding removes flash-of-unstyled-text and startup work on slow devices.

### Styling (NativeWind v5 preview + Tailwind v4)

#### [SEV-1] NativeWind v5 is a pre-release with exact setup requirements — match the installed versions

- **Practice:** v5 (preview) requires peer deps `react-native-css` (repo: ^3.0.7), reanimated, safe-area-context; `withNativewind` in metro.config.js; `global.css` imported at the top-most component (NOT the file calling `AppRegistry.registerComponent`, or Fast Refresh breaks); and an explicit `overrides: { lightningcss: "1.30.1" }` pin — "If you don't pin the lightningcss version, you may encounter deserialization errors with respect to global.css". **The repo already pins it — do not remove.**
- **Source:** https://www.nativewind.dev/v5/getting-started/installation · https://www.nativewind.dev/v5
- **Why:** "Fixing" the lightningcss override or import location will break the build.

#### [SEV-2] Tailwind v4 theme tokens live in `@theme`, not `:root`

- **Practice:** "Theme variables are special CSS variables defined using the `@theme` directive that influence which utility classes exist" — `@theme { --color-mint-500: ... }` generates utilities; plain `:root` variables do NOT create utility classes. (This is exactly why `rounded-10`/`bg-primary` silently vanished — see GOTCHAS.md Frontend SEV-1.)
- **Source:** https://tailwindcss.com/docs/theme
- **Why:** Defining brand colors as `:root` vars silently produces no `bg-*` utilities.

#### [SEV-2] Dark mode: `dark:` follows system by default; class strategy needs `@custom-variant`

- **Practice:** Tailwind v4: `dark:` defaults to `prefers-color-scheme`; for a manual toggle use `@custom-variant dark (&:where(.dark, .dark *))`. NativeWind v5: `dark:` maps to `prefers-color-scheme` "which is reactive on both native and web" — manual toggles go through RN's `Appearance` API (setColorScheme).
- **Source:** https://tailwindcss.com/docs/dark-mode · https://www.nativewind.dev/v5/core-concepts/dark-mode
- **Why:** Field salesmen in bright daylight: system-dark phones will render dark UI unless variant + Appearance are wired consistently.

---

## Drizzle ORM + mysql2

#### [SEV-1] Queries are parameterized automatically — never interpolate user input into raw SQL

- **Practice:** Drizzle's select docs state values are "parameterized automatically"; use `sql` templates or `.where()` bindings rather than string concatenation.
- **Source:** https://orm.drizzle.team/docs/select
- **Why:** SQL injection is the #1 server vuln; the builder makes it structurally impossible.

#### [SEV-1] Multi-step writes: wrap in `db.transaction(async (tx) => …)`

- **Practice:** Transaction API documented with rollback, nested transactions via savepoints, and `isolationLevel` (e.g., `'read committed'`). For row-level safety under concurrency, `SELECT … FOR UPDATE` inside the transaction.
- **Source:** https://orm.drizzle.team/docs/transactions
- **Why:** Order + payment + inventory must commit or fail as one unit.

#### [SEV-2] Connection pooling: use `mysql2.createPool` with `connectionLimit` — never a fresh connection per request

- **Practice:** Create the pool with `waitForConnections`, `connectionLimit`, `idleTimeout`, `queueLimit`, `enableKeepAlive`; connections are created on demand and "automatically released when query resolves" with `pool.query()`.
- **Source:** https://sidorares.github.io/node-mysql2/docs
- **Why:** Per-request `createConnection` exhausts MySQL's max_connections and adds handshake latency.

#### [SEV-2] Migrations workflow: `drizzle-kit generate` → review SQL → `drizzle-kit migrate`; `push` is for dev only

- **Practice:** generate creates versioned SQL migrations from schema; push syncs schema directly. Declare `index()`es in schema.ts so generated migrations include them.
- **Source:** https://orm.drizzle.team/docs/migrations
- **Why:** `db:push` against prod is how schema drift + data loss happen; generated migrations are reviewable/rollbackable.

#### [SEV-2] Avoid N+1: use relational queries (`.with`) or explicit joins

- **Practice:** "Relational queries are meant to provide you with a great developer experience for querying nested relational data… avoiding multiple joins and complex data mappings" — declare `relations()` once, query with `with: { … }`.
- **Source:** https://orm.drizzle.team/docs/rqb
- **Why:** `for (item of rows) await db.select…` = N+1 network round-trips; relational queries collapse to efficient SQL.

#### [SEV-3] Pagination: `limit`/`offset` documented pattern; keyset for very large tables

- **Practice:** Official "Limit/Offset pagination" guide — `select().limit(n).offset(m)`; use cursor/keyset pagination for very large tables. Upsert on MySQL: `.onDuplicateKeyUpdate({ set: … })`.
- **Source:** https://orm.drizzle.team/docs/guides/limit-offset-pagination · https://orm.drizzle.team/docs/mysql/insert
- **Why:** Deep offsets make MySQL scan+discard rows; keyset keeps queries O(page); upsert avoids read-then-write races on unique keys.

---

## Express 5 + helmet + cors + rate-limit

#### [SEV-2] Express 5 catches rejected promises from async handlers automatically — no wrapper needed, but return the promise!

- **Practice:** "Route handlers and middleware that return a Promise call next(value) automatically when they reject or throw an error". **Gotcha:** "If the promise is not returned, Express does not know it exists… the rejection would be unhandled and crash the process" — use `await` or `return` inside async handlers.
- **Source:** https://expressjs.com/en/guide/error-handling.html
- **Why:** Express 5 removed the need for asyncHandler wrappers, but only for _returned_ promises.

#### [SEV-1] Error-handling middleware: exactly 4 args `(err, req, res, next)`, registered last

- **Practice:** "Error-handling functions have four arguments instead of three"; registered last, after routes. Express's default error handler at the end of the stack returns HTML — not your JSON shape. Also add an explicit JSON 404 catch-all after routes (`app.use((req, res) => res.status(404).json({ error: 'Not Found' }))`).
- **Source:** https://expressjs.com/en/guide/error-handling.html
- **Why:** 3-arg middleware is skipped as error handler; your 500s leak as HTML without a JSON error middleware.

#### [SEV-1] Trust proxy: configure `app.set('trust proxy', …)` correctly — blind `true` lets clients spoof IPs

- **Practice:** "When setting to true… ensure that the last reverse proxy trusted is removing/overwriting all of the following HTTP headers: X-Forwarded-For, X-Forwarded-Host, and X-Forwarded-Proto, otherwise it may be possible for the client to provide any value." Prefer subnet lists (`'loopback'`) or hop counts.
- **Source:** https://expressjs.com/en/guide/behind-proxies.html
- **Why:** Your rate limiter + audit logs key on `req.ip`; spoofable X-Forwarded-For = bypass.

#### [SEV-2] JSON body limit: `express.json()` defaults to `100kb` — don't raise it to megabytes casually

- **Practice:** `limit` "Defaults to '100kb'"; official guidance: "It's recommended not to configure a very high limit… payloads of 5 MB or more can already start to introduce these risks". Use multipart for files.
- **Source:** https://expressjs.com/en/resources/middleware/body-parser.html
- **Why:** Huge JSON bodies are a memory/DoS vector.

#### [SEV-1] Rate limiting: in-memory store is per-process — multi-instance deploys need rate-limit-redis

- **Practice:** Built-in `memory-store` "does not share state when app has multiple processes or servers"; `rate-limit-redis` is "A Redis-backed store, more suitable for large or demanding deployments" — set via `store:`. Wire it as `new RedisStore({ sendCommand: (...args) => client.sendCommand(args) })` (node-redis driver) — passing the client directly is the top integration bug.
- **Source:** https://express-rate-limit.mintlify.app/reference/stores · https://github.com/express-rate-limit/rate-limit-redis
- **Why:** N instances × limit = N× the allowed requests (or one user's 429 bricks the API when `trust proxy` is missing and everyone shares the proxy IP).

#### [SEV-2] Key by user for authenticated routes — `keyGenerator` defaults to IP

- **Practice:** Defaults to IP address; custom keyGenerator should strip `:port`; `ipv6Subnet: 56` controls IPv6 granularity. Use `skipSuccessfulRequests`/`requestWasSuccessful` on login endpoints so limits trigger on failures, not successes. v8 API: option is `limit` (NOT `max` — v6 API silently no-ops); `standardHeaders: 'draft-8'`, `legacyHeaders: false`.
- **Source:** https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues · https://github.com/express-rate-limit/express-rate-limit
- **Why:** Per-IP limits on shared NATs punish innocent users; wrong option names from old tutorials silently disable limiting.

#### [SEV-2] helmet defaults + dotenv: load dotenv first, validate env at boot

- **Practice:** helmet default CSP `default-src 'self'` + 15 header middlewares; it removes `X-Powered-By` (also `app.disable("x-powered-by")`). dotenv: "As early as possible… import and configure"; it never overrides already-set env vars. Validate the whole `process.env` surface with one zod schema at boot (`safeParse` → throw) so missing secrets fail fast.
- **Source:** https://github.com/helmetjs/helmet · https://github.com/motdotla/dotenv · https://raw.githubusercontent.com/colinhacks/zod/v3/README.md
- **Why:** Fail-fast boot turns config typos into a 2-second fix instead of a prod incident; leaking `X-Powered-By: Express` advertises your stack.

#### [SEV-1] CORS doesn't block requests — it only sets headers; don't treat it as a security gate

- **Practice:** "This package sets response headers—it doesn't block requests. CORS is enforced by browsers… Non-browser clients ignore CORS entirely." `credentials: true` requires an explicit origin (never `*` + credentials); use a dynamic origin callback.
- **Source:** https://github.com/expressjs/cors
- **Why:** Your API is open to any server-side caller regardless of `origin` config — auth must come from tokens.

---

## jsonwebtoken + bcryptjs

#### [SEV-1] Whitelist algorithms on `verify()` — never verify without `algorithms`

- **Practice:** `algorithms: ["HS256", "HS384"]`; defaults are derived from the key type — an asymmetric key can otherwise be abused for HS256 forgery (alg confusion). `none` = no signature — never allow.
- **Source:** https://github.com/auth0/node-jsonwebtoken · https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html
- **Why:** Algorithm confusion lets attackers forge tokens with the public key.

#### [SEV-1] Signing secret must be CSPRNG-random and ≥ the hash output size (≥256 bits for HS256)

- **Practice:** OWASP: "The secret must be generated using a local, cryptographically secure secret generator. The secret must have at least the same size as the output (eg. 256, 384 and 512 bits respectively for HS256, HS384 and HS512). Do not publish your secret key!" Validate `JWT_SECRET.length >= 32` at boot.
- **Source:** https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html · https://github.com/auth0/node-jsonwebtoken
- **Why:** Short/dictionary secrets are brute-forceable offline from the token itself.

#### [SEV-2] Always set `expiresIn` — there are NO defaults; remember `'120'` means 120 _milliseconds_

- **Practice:** "There are no default values for expiresIn, notBefore, audience, subject, issuer"; `expiresIn` accepts `60`, `"2 days"`, `"10h"`, `"7d"`; "A numeric value is interpreted as a seconds count… otherwise milliseconds unit is used by default ('120' is equal to '120ms')". Claims (e.g. `exp`) are only set if the payload is an object literal; don't duplicate claims in options + payload.
- **Source:** https://github.com/auth0/node-jsonwebtoken
- **Why:** No expiry = eternal token; unitless strings = tokens that expire instantly (or in 2 hours you never wanted).

#### [SEV-1] Refresh tokens: short-lived access + rotating refresh — and enforce revocation server-side

- **Practice:** Library: "we recommend you to think carefully if auto-refreshing a JWT will not introduce any vulnerability… We are not comfortable including this as part of the library." Auth0 docs: use refresh-token rotation so a stolen refresh token can't be replayed. Long-lived access tokens can't be revoked server-side — keep access short (15m), rotate refresh tokens, check `tokenVersion`/jti on every refresh.
- **Source:** https://github.com/auth0/node-jsonwebtoken · https://auth0.com/docs/secure/tokens/refresh-tokens
- **Why:** A leaked refresh token without rotation/reuse-detection is a permanent backdoor (see GOTCHAS.md Security SEV-1).

#### [SEV-1] bcrypt input is capped at 72 bytes — longer passwords silently truncate; check with `bcrypt.truncates()`

- **Practice:** "The maximum input length is 72 bytes (note that UTF-8 encoded characters use up to 4 bytes)… should be checked with bcrypt.truncates(password) where necessary." Reject or pre-hash longer inputs.
- **Source:** https://github.com/dcodeIO/bcrypt.js
- **Why:** A 73-byte password can validate against a different password sharing the first 72 bytes — a real auth bypass vector.

#### [SEV-2] Cost factor: `rounds` defaults to 10 — raise as hardware improves; use the async API

- **Practice:** `genSalt`/`hash` default to 10 rounds; async `hash`/`genSalt` return Promises. Verify with `bcrypt.compare()` — never compare hash strings yourself. Hashes are 60 chars — size DB columns ≥ VARCHAR(60).
- **Source:** https://github.com/dcodeIO/bcrypt.js
- **Why:** Sync hashing blocks the Node event loop (a login endpoint becomes a DoS amplifier); hand-rolled `===` comparisons reintroduce timing leaks.

---

## @gorhom/bottom-sheet v5

#### [SEV-2] v5 changes: `enableDynamicSizing` defaults to true — `snapPoints` becomes optional; cap height with `maxDynamicContentSize`

- **Practice:** "This prop is required if you set enableDynamicSizing to false (it's true by default)"; dynamic sizing "internally managed to calculate static views and list content size height"; "In order to prevent the bottom sheet exceeding a certain height, you will need to set maxDynamicContentSize prop".
- **Source:** https://gorhom.dev/react-native-bottom-sheet/props · https://gorhom.dev/react-native-bottom-sheet/dynamic-sizing
- **Why:** v4 tutorials that always pass snapPoints can fight the v5 dynamic-size engine; without maxDynamicContentSize, tall content fills the screen.

#### [SEV-2] Use the pre-configured scrollables (`BottomSheetView`/`BottomSheetScrollView`) for dynamic sizing to work

- **Practice:** "In order to enable the dynamic sizing to work properly… Use the pre-configured Scrollables views, including the static view BottomSheetView."
- **Source:** https://gorhom.dev/react-native-bottom-sheet/dynamic-sizing
- **Why:** Plain RN ScrollViews don't report content size to the sheet — sizing silently falls back.

#### [SEV-3] Keyboard: use `BottomSheetTextInput` (pre-integrated) or copy its focus/blur handlers

- **Practice:** "I have created a pre-integrated TextInput called BottomSheetTextInput, which communicate internally to react to the keyboard appearance"; otherwise copy `handleOnFocus`/`handleOnBlur` into your own component. Keyboard config: `keyboardBehavior`, `keyboardBlurBehavior`, `android_keyboardInputMode`. Gesture config is opt-out: `enablePanDownToClose`, `enableContentPanningGesture`, `enableOverDrag` — disable for forms inside sheets to stop accidental dismissals.
- **Source:** https://gorhom.dev/react-native-bottom-sheet/keyboard-handling · https://gorhom.dev/react-native-bottom-sheet/props
- **Why:** A plain TextInput inside a sheet doesn't know the sheet must resize — keyboard overlaps content; mid-input dismissal loses data.

#### [SEV-3] Wrap in `GestureHandlerRootView`; v5 is Reanimated v3+; v4 docs are unmaintained

- **Practice:** Official usage: `<GestureHandlerRootView>` → `<BottomSheet ref={…} onChange={…}>`; v5 is "written with Reanimated v3 & Gesture Handler v2" while "v4 (not maintained)" is Reanimated v2 — v4 snippets may use removed APIs.
- **Source:** https://gorhom.dev/react-native-bottom-sheet/usage · https://github.com/gorhom/react-native-bottom-sheet
- **Why:** Missing GestureHandlerRootView = "GestureDetector must be used as a descendant of GestureHandlerRootView" crashes.

---

## react-native-maps 1.27

#### [SEV-2] `initialRegion` only sets the initial viewport — changing it after mount does nothing; use `region` for controlled maps

- **Practice:** "Use this prop instead of `region` only if you don't want to control the viewport of the map besides the initial region. **Changing this prop after the component has mounted will not result in a region change.**"
- **Source:** https://github.com/react-native-maps/react-native-maps/blob/master/docs/mapview.md
- **Why:** The classic "I update initialRegion on location change and the map doesn't move" bug.

#### [SEV-2] Custom-view markers have documented performance implications — prefer image markers

- **Practice:** "Rendering a Marker with a custom view — **Note: This has performance implications**, if you wish for a simpler solution go with a custom image (save yourself the headache)". For custom views, re-mount via `key` when content changes or toggle `tracksViewChanges` (Android keeps the last rendered snapshot otherwise).
- **Source:** https://github.com/react-native-maps/react-native-maps
- **Why:** Each custom-view marker is a native view — hundreds of them tank frame rate and memory.

#### [SEV-1] Android REQUIRES a Google Maps API key — map renders blank without it

- **Practice:** "On Android, one has to use Google Maps, which in turn requires you to obtain an API key for the Android SDK"; wire via the Expo config plugin, read from `.env`, restrict by package + SHA-1 (see Security section).
- **Source:** https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md
- **Why:** Missing/incorrect key = grey/blank map on Android only — the classic "works on iOS, empty on Android" report.

#### [SEV-3] No built-in clustering — aggregate markers yourself (supercluster-style) for large sets

- **Practice:** Map features are declarative children; clustering is not provided by the library — render a reduced set of cluster markers instead of every point. `region` and `camera` are mutually exclusive — "If you use this [camera], the `region` property is ignored."
- **Source:** https://github.com/react-native-maps/react-native-maps · https://github.com/react-native-maps/react-native-maps/blob/master/docs/mapview.md
- **Why:** 1,000 `<Marker>` children = 1,000 native views; mixed region/camera props produce "why does my region change do nothing" sessions.

---

## expo-secure-store / image-picker / location

#### [SEV-1] SecureStore = encrypted keychain/keystore: use it for tokens/secrets; AsyncStorage is unencrypted

- **Practice:** Purpose: "encrypt and securely store key-value pairs locally on the device"; "Each Expo project has a separate storage system and has no access to the storage of other Expo projects."
- **Source:** https://docs.expo.dev/versions/latest/sdk/securestore/
- **Why:** This is the sanctioned place for JWTs/refresh tokens.

#### [SEV-2] ~2KB-per-value practical limit; set `keychainAccessible` deliberately

- **Practice:** "Large payloads can be rejected by the underlying platform. Historically, some iOS releases refused values above roughly 2048 bytes… make sure to handle native errors." `keychainAccessible`: `AFTER_FIRST_UNLOCK` vs `WHEN_UNLOCKED` vs `THIS_DEVICE_ONLY` variants (block iCloud/keychain migration). `requireAuthentication` (biometrics) is not supported in Expo Go without NSFaceIDUsageDescription.
- **Source:** https://docs.expo.dev/versions/latest/sdk/securestore/
- **Why:** Storing a big JSON blob throws on-device; wrong accessibility = tokens unavailable after reboot or migrated off-device via backups.

#### [SEV-3] Don't use SecureStore for non-secret, high-churn data — that's AsyncStorage/MMKV territory

- **Practice:** SecureStore is for small secrets that must be encrypted; AsyncStorage is the "unencrypted, persistent key-value storage" for general app data (far higher throughput for frequent writes).
- **Source:** https://docs.expo.dev/versions/latest/sdk/securestore/ · https://github.com/react-native-async-storage/async-storage
- **Why:** Keychain writes are slow and limited; storing every UI pref there wastes platform resources.

#### [SEV-1] Image uploads need a real pipeline — bytes to storage, size/type validation before pick

- **Practice:** expo-image-picker returns local `file://` URIs; persisting those as URLs breaks for every other device/user. Validate size/type from the picker result _before_ handoff, upload bytes to server storage (multipart → S3/disk → returned URL), and never trust client-claimed dimensions/types server-side. image-picker needs NO permission to open the library on Android; kill `RECORD_AUDIO` via `microphonePermission: false` / `blockedPermissions`.
- **Source:** https://docs.expo.dev/versions/v56.0.0/sdk/imagepicker/ · https://docs.expo.dev/guides/permissions/
- **Why:** "Up to 5MB" labels without enforcement are lies; `file://` paths are device-local.

---

## Common AI-Agent Mistakes in RN/Expo Apps

_Each pattern is anchored to the official doc it violates (all URLs verified Aug 2026). Drawn from agent-observed failure modes + this repo's own conventions._

#### [SEV-1] Storing JWTs/refresh tokens in AsyncStorage (or zustand persist)

- **Mistake:** Agents default to AsyncStorage because it's the most common storage snippet in training data; the Expo Router auth guide itself uses `expo-secure-store` for tokens.
- **Source:** https://docs.expo.dev/router/advanced/authentication/ · https://docs.expo.dev/versions/v56.0.0/sdk/securestore/
- **Why:** Plaintext credentials on disk = the single most common RN security finding.

#### [SEV-1] Array index as React key

- **Mistake:** `key={index}` in maps/FlatLists. React docs: "Index as a key often leads to subtle and confusing bugs" (state bleed on reorder/filter). Repo CLAUDE.md already bans it.
- **Source:** https://react.dev/learn/rendering-lists
- **Why:** Reordered/filtered lists render wrong rows with stale state — looks like a "random" data bug.

#### [SEV-1] Wrong reanimated API for the installed version (v3 patterns on v4, missing worklets)

- **Mistake:** Training data is dominated by Reanimated 2/3 code (`useAnimatedStyle` from wrong import, `Animated.View` from 'react-native' inside worklet code, no `react-native-worklets`). Repo AGENTS.md exists precisely because of this: read the versioned docs first.
- **Source:** https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/
- **Why:** v4 requires New Arch + worklets; mismatched code crashes at runtime, not compile time.

#### [SEV-1] Forgetting query invalidation after mutations

- **Mistake:** Agent writes `useMutation` that updates the server and stops — the cached list stays stale forever.
- **Source:** https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations
- **Why:** The classic "it works until you look at the list again" bug; invisible to unit tests.

#### [SEV-1] Ignoring reduced motion (and the Android "Animation off" setting)

- **Mistake:** Custom `withTiming`/`withSpring` code without `ReduceMotion` config; layout animations that ignore the setting. Reanimated defaults to `ReduceMotion.System` only for built-in configs; hand-rolled animation logic must check `useReducedMotion()`.
- **Source:** https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/ · https://reactnative.dev/docs/accessibilityinfo
- **Why:** Repo CLAUDE.md mandates it; Android's Developer-options "Animation off" also triggers `reduceMotionChanged`.

#### [SEV-1] Writing tests that mock everything, so real regressions pass

- **Mistake:** Agents over-mock fetch/storage/navigation so tests assert implementation, not behavior. Testing Library: "The more your tests resemble the way your software is used, the more confidence they can give you." This repo commits to real integration (server tests run against MySQL; CI starts its own).
- **Source:** https://testing-library.com/docs/guiding-principles
- **Why:** A green suite that mocks the bug away has negative value — it blocks honest CI signals.

#### [SEV-2] Hardcoding API URLs / secrets in source

- **Mistake:** `fetch('http://192.168.x.x:3000/api')` or inlined keys. Use `EXPO_PUBLIC_` env vars for non-secret config — and remember they're inlined into the bundle in plain text; secrets go server-side.
- **Source:** https://docs.expo.dev/guides/environment-variables/ · https://developer.android.com/training/articles/security-config
- **Why:** Cleartext HTTP breaks on Android 9+; hardcoded secrets ship to every device.

#### [SEV-2] Using v4-era TanStack Query APIs (`onSuccess` on queries, `errorBoundary`)

- **Mistake:** v5 removed query-level `onSuccess`/`onError`/`onSettled` and renamed `useErrorBoundary` → `throwOnError`. Code compiles (types are loose) and silently no-ops.
- **Source:** https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5
- **Why:** Silent behavioral no-ops are the hardest regressions to find.

#### [SEV-2] Duplicating types instead of sharing the shared package

- **Mistake:** Agents re-declare `Customer`/`Order` interfaces locally instead of importing from `@sales-app/shared` (already a dependency). Server and client schemas diverge; zod schemas should be shared too (single source of truth for validation).
- **Source:** https://github.com/react-hook-form/resolvers (shared-schema resolver pattern)
- **Why:** "Works locally, breaks in prod" — the classic duplicated-type failure.

#### [SEV-2] Re-render storms from selector-less zustand usage or inline handlers in lists

- **Mistake:** `const { field } = useStore()` (whole-store subscription), object-literal selectors without `useShallow`, inline `renderItem`/`onPress` closures in FlatLists.
- **Source:** https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow · https://reactnative.dev/docs/optimizing-flatlist-configuration
- **Why:** Jank on mid-range Android that never reproduces on the dev's iPhone/simulator.

#### [SEV-2] Ignoring Android specifics (back button, cleartext, keyboard, permissions)

- **Mistake:** Agents develop on iOS/web mentally: no `BackHandler` handling, `http://` URLs, keyboard covering inputs, permissions requested at app start instead of at point-of-use. This repo is Android-primary.
- **Source:** https://reactnative.dev/docs/backhandler · https://developer.android.com/training/articles/security-config · https://docs.expo.dev/guides/permissions/
- **Why:** Each one is a release-blocking bug on the primary platform.

#### [SEV-3] Over-engineering: global store for everything, premature abstraction

- **Mistake:** Monolithic zustand store for data react-query should own, redux-style boilerplate, generic "engine" components for one use. Keep server data in react-query, UI state in small single-purpose stores, components dumb.
- **Source:** https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
- **Why:** Over-abstraction is the top maintenance-cost driver in AI-generated RN code.

---

## Checklists — run these against new code

### Top 10 RN/Expo practices to verify (from research)

1. **Tokens in expo-secure-store, never AsyncStorage/zustand-persist** — https://docs.expo.dev/versions/v56.0.0/sdk/securestore/
2. **New Architecture is mandatory (SDK 56)** — no `newArchEnabled` remnants; run `npx expo-doctor` — https://docs.expo.dev/guides/new-architecture/
3. **FlatList discipline in all list screens** — `getItemLayout`, `windowSize`, hoisted `useCallback` renderItem, `memo`'d rows, stable `keyExtractor` — https://reactnative.dev/docs/optimizing-flatlist-configuration
4. **No `InteractionManager` in new code** — use `requestIdleCallback` — https://reactnative.dev/docs/interactionmanager
5. **Auth flow matches the router pattern** — `(app)` group + layout guard (+ `Stack.Protected`), splash held until session loads, sign-out clears history — https://docs.expo.dev/router/advanced/authentication/
6. **react-query: keys as arrays via a factory, mutations invalidate, `staleTime` set, no v4 APIs** (`throwOnError` only) — https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5
7. **Reduced motion everywhere** — reanimated `ReduceMotion.System`/`useReducedMotion()` on all custom animations — https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/
8. **Android-first pass** — BackHandler/`onRequestClose`, HTTPS-only endpoints, `softwareKeyboardLayoutMode`, `react-native-safe-area-context` (not RN SafeAreaView), permissions at point-of-use, `blockedPermissions` for RECORD_AUDIO — https://reactnative.dev/docs/backhandler · https://docs.expo.dev/guides/permissions/
9. **NativeWind v5 setup untouched** — lightningcss 1.30.1 override stays, `global.css` import location stays, `@theme` tokens (not `:root`) for brand colors — https://www.nativewind.dev/v5/getting-started/installation · https://tailwindcss.com/docs/theme
10. **Shared types/schemas from `@sales-app/shared`** — no duplicated interfaces/zod schemas; zodResolver on module-level schemas; Controller only for non-ref components — https://github.com/react-hook-form/resolvers

### Top 15 library practices to verify (from research)

1. **JWT: whitelist algorithms on `verify()` and never allow `none`** — https://github.com/auth0/node-jsonwebtoken
2. **JWT: HS256 secret ≥ 256 bits from a CSPRNG, never committed** — https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html
3. **Tokens: never persist via zustand persist/AsyncStorage (plaintext) — use expo-secure-store** — https://zustand.docs.pmnd.rs/reference/middlewares/persist · https://docs.expo.dev/versions/latest/sdk/securestore/
4. **Rate limit: shared Redis store + correct `trust proxy` (or every user shares one IP/global limiter)** — https://express-rate-limit.mintlify.app/guides/troubleshooting-proxy-issues
5. **bcryptjs: enforce the 72-byte cap (`bcrypt.truncates`), rounds ≥ 10, async hash** — https://github.com/dcodeIO/bcrypt.js
6. **Express 5: async handlers must return/await the promise or rejections crash the process; 4-arg error middleware last** — https://expressjs.com/en/guide/error-handling.html
7. **API bodies: `.strict()` zod schemas + `safeParse` at the boundary, shared from packages/shared** — https://raw.githubusercontent.com/colinhacks/zod/v3/README.md
8. **Drizzle: transactions for multi-step writes; `onDuplicateKeyUpdate` for upserts; relational queries to kill N+1** — https://orm.drizzle.team/docs/transactions · https://orm.drizzle.team/docs/rqb
9. **mysql2: single `createPool` with `connectionLimit`, `pool.query()` — no per-request connections** — https://sidorares.github.io/node-mysql2/docs
10. **React Query: staleTime is 0 by default — set per-domain; invalidate in mutation onSuccess and return the promise** — https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults · https://tanstack.com/query/v5/docs/framework/react/guides/invalidations-from-mutations
11. **Zustand: selector subscriptions + `useShallow` for object/array selectors; `subscribeWithSelector` for transient updates** — https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow
12. **RHF: zodResolver + Controller for RN inputs; `values` (reactive) vs `defaultValues` (cached); reset after submit** — https://react-hook-form.com/docs/useform
13. **RN Maps: `initialRegion` is mount-only (use `region` to move); Android needs the Google Maps API key; custom-view markers are slow** — https://github.com/react-native-maps/react-native-maps/blob/master/docs/mapview.md
14. **Bottom sheet v5: dynamic sizing is ON by default (snapPoints optional) — use BottomSheetView + `maxDynamicContentSize`; keyboard via `BottomSheetTextInput`** — https://gorhom.dev/react-native-bottom-sheet/dynamic-sizing
15. **Server boot: dotenv first, then zod-validate `process.env`; helmet defaults on; JSON body limit stays ~100kb** — https://github.com/motdotla/dotenv · https://expressjs.com/en/resources/middleware/body-parser.html

---

## Research trail

| Date       | Research                                                                                       | Source                               |
| ---------- | ---------------------------------------------------------------------------------------------- | ------------------------------------ |
| 2026-08-05 | RN/Expo best practices + library best practices (2 parallel research subagents, official docs) | Branch `review/best-practices-audit` |

_Research method note: all sources were fetched and content-verified during the research session (search backends were unavailable; direct doc fetching used). Version-sensitive claims pinned to repo package.json versions._
