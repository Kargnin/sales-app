# Antigravity Agent Instructions

## Code Quality Rules
After any code changes:
1. Make sure there are no TypeScript compilation errors.
2. Make sure the server + client code builds and runs without any issues.

Always first check the best way to structure a role-based UI component when a component is used/rendered in multiple roles.

Search the web for best practices for both server as well as client side.

Always think about the structure/low-level design of a component first, extract out common rendering components, just pass the input data for the component to render, keep the business logic separate from UI.

We should be able to change UI components easily without affecting the application.

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
