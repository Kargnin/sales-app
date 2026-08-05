After any code changes:

1. Make sure there are no typescript compilation errors
2. Make sure the server + client code builds and runs without any issues

Always first check the best way to structure a role-based UI component when a component is used/rendered in multiple roles.

Search the web for best practices for both server as well as client side.

Always think about the structure/low-level design of a component first, extract out common rendering components, just pass the input data for the component to render, keep the business logic separate from UI.

We should be able to change UI components easily without affecting the application.

Target: React Native + Expo with Expo Router for both iOS and Android (Android primary).

Use Expo and React Native related skills whenever possible.

For UI design use Stitch MCP to fetch app page designs.

Stitch project ID: 2048573934882273867

## State Management

- Use Zustand selectors (`useStore((s) => s.field)`) instead of destructuring (`const { field } = useStore()`). Selectors prevent unnecessary re-renders and keep the store extensible.
- Dedicated single-purpose stores (e.g., `uiStore` for UI state, `authStore` for auth) over one monolithic store.

## React Patterns

- Use a stable, unique data property as React `key` (`key={item.id}`), not array index. Index keys break on reorder/filter.
- Wrap event handlers in `useCallback` when they are dependencies of other hooks or passed as props to memoized children.
- Module-level constants and `require()` calls go at the top of the file, not inside component bodies.

## Accessibility

- Every animation must handle reduced motion. Use `useReducedMotion()` from `react-native-reanimated` and skip animations (duration: 0) when the user has the setting enabled.

## Consistency

- Before writing a new file, check patterns used in sibling files from the same feature. Consistency within a single feature is as important as consistency with the broader codebase.
- Check if a component/hook/utility already exists before creating a duplicate. Search the codebase for similar names.

## Tests & Database

- Server integration tests need MySQL. The project's DB container is `mysql-local` — start it (do NOT create a new one) before running server tests:
  `docker start mysql-local`
- When MySQL is unreachable the DB integration suites skip cleanly and the run prints the start command (see `server/src/__tests__/helpers/dbAvailable.ts`). CI always starts its own MySQL service, so nothing is skipped there.

## Branch Policy (main)

- **No direct pushes to `main`** — enforced by the `.husky/pre-push` hook. All changes land via a pull request with all three CI jobs green (Client / Server / Shared). To bypass the hook intentionally (e.g. emergency hotfix): `git push --no-verify`.
