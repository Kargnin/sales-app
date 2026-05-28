# Antigravity Agent Instructions

## Project Context

This is a React Native + Expo (SDK 56) app targeting iOS and Android, with Android as the primary platform. The server is an Express + Drizzle ORM backend.

- **Client**: `client/` — Expo Router file-based routing, NativeWind v5 styling with Stitch "Warm Tactile Industrial" design tokens, Zustand (client state) + TanStack Query (server data)
- **Server**: `server/` — Express API on port 3001, MySQL via Drizzle ORM, JWT auth with refresh tokens
- **Design source**: Stitch project `2048573934882273867`

## Code Quality Rules
After any code changes:
1. Make sure there are no TypeScript compilation errors (`cd client && npx tsc --noEmit`).
2. Make sure the Expo client builds without errors (`cd client && npx expo start --web` or native build).
3. Make sure the server compiles and runs without errors.

Always first check the best way to structure a role-based UI component when a component is used/rendered in multiple roles (admin vs salesman).

Search the web for best practices for both server as well as client side. For client, prioritize Expo and React Native best practices.

Always think about the structure/low-level design of a component first, extract out common rendering components, just pass the input data for the component to render, keep the business logic separate from UI.

We should be able to change UI components easily without affecting the application.

Use Expo and React Native related skills whenever possible.

For UI design use Stitch MCP to fetch app page designs.

## React & State Patterns

- **Zustand selectors**: Always use individual selectors (`useStore((s) => s.field)`) instead of destructuring the entire store (`const { field } = useStore()`). Selectors prevent unnecessary re-renders and keep the store extensible when new state is added later.
- **React keys**: Use a stable, unique data property as the `key` prop (`key={item.id}`, `key={item.route}`). Never use array index unless the list is guaranteed to never reorder, filter, or insert/remove items.
- **useCallback**: Wrap event handlers in `useCallback` when they are dependencies of other hooks (`useCallback`, `useMemo`, `useEffect`) or passed as props to memoized children.
- **Module scope**: Place `require()` calls and module-level constants at the top of the file, not inside component bodies.
- **Consistency across files**: Before writing a new file, check patterns used in sibling files from the same feature. Both files should follow the same conventions (selector patterns, handler patterns, import style).
- **No duplicate components**: Before creating a component, search the codebase for an existing equivalent. Reuse or adapt rather than duplicating.

## Accessibility

- Every animation must handle reduced motion. Use `useReducedMotion()` from `react-native-reanimated` and skip animations (instant `duration: 0`) when the user has the OS accessibility setting enabled.
- Add `accessibilityRole` and `accessibilityLabel` on interactive elements (buttons, links, toggles).

## NativeWind v5 Notes

- Shadow classes (`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-none`) are **fully supported** on native iOS and Android.
- `active:` pseudo-class is **fully supported** on native (maps to `onPressIn`/`onPressOut` on `Pressable`/`TouchableOpacity`).
- Transition classes (`transition-colors`, `transition-all`, etc.) have **experimental** support on native. Prefer `activeOpacity` for press feedback, which is guaranteed to work.

## Planning & Artifact Rules

Whenever you create or update planning artifacts (implementation_plan, walkthrough, task):

1. **Mirror artifacts** to `.agents/plans/current/`:
   - `implementation_plan.md` → `.agents/plans/current/implementation_plan.md`
   - `walkthrough.md` → `.agents/plans/current/walkthrough.md`
   - `task.md` → `.agents/plans/current/task.md`

2. **Set status** in `.agents/plans/current/STATUS.md` with exactly one word:
   - `PLANNING_READY` — plan written, awaiting Claude Code review
   - `PLANNING_REVIEWED` — Claude Code has reviewed the plan (set by Claude Code, not you)
   - `IMPLEMENTING` — review incorporated, implementing now
   - `DONE` — implementation complete, walkthrough ready for audit
   - `AUDITED` — Claude Code has audited the walkthrough (set by Claude Code, not you)

   If you encounter an error during implementation, set STATUS to `ERROR` and describe the problem in the walkthrough.

3. **Track session** by writing your Antigravity brain session path to `.agents/plans/current/.session`
   (e.g., `/Users/bhushanmalani/.gemini/antigravity-ide/brain/<session-id>`)

4. **Before implementing**: wait for user confirmation. If `.agents/plans/current/plan-review.md` exists, read it and incorporate all suggestions into your implementation. If you disagree with a suggestion, explain why in the walkthrough.

5. **After setting STATUS to DONE**: wait for user confirmation. If code changes are made during the audit phase, update the walkthrough and task checklist to reflect them.
