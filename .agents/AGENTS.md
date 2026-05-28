# Antigravity Agent Instructions

## Project Context

This is a React Native + Expo (SDK 56) app targeting iOS and Android, with Android as the primary platform. The server is an Express + Drizzle ORM backend.

- **Client**: `client/` — Expo Router file-based routing, NativeWind v4 styling with Stitch "Warm Tactile Industrial" design tokens, Zustand (client state) + TanStack Query (server data)
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
