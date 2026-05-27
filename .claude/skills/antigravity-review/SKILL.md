---
name: antigravity-review
description: Review and audit Antigravity agent output. Use whenever the user mentions Antigravity, an Antigravity-generated plan, walkthrough, or implementation, checking Antigravity's work, reviewing what Antigravity did, auditing agent output, or any task involving .agents/plans/current/. Also use when the user says "review the plan", "check the implementation", or wants to verify agent-generated code changes.
---

# Antigravity Review Skill

Two-phase review pipeline for Antigravity agent output. Both phases are designed to run in a single Claude Code session — the first invocation reviews the plan, and after Antigravity implements, the second invocation audits the result. This keeps the codebase fresh in context and maximizes HV cache hits.

## Phase Detection

First, check that `.agents/plans/current/` exists. If it doesn't, tell the user: "No Antigravity artifacts found. Run Antigravity first to generate an implementation plan."

If the directory exists, read `.agents/plans/current/STATUS.md`. The single word inside determines the phase:

| STATUS | Action |
|---|---|
| `PLANNING_READY` | Run **Phase 1: Plan Review** |
| `PLANNING_REVIEWED` | Plan was already reviewed. If the user wants a re-review, run Phase 1 again. Otherwise tell them to let Antigravity implement, then re-invoke when STATUS is `DONE`. |
| `DONE` | Run **Phase 2: Walkthrough Audit** |
| `IMPLEMENTING` | Antigravity is still working. Tell the user to wait and re-invoke later. |
| `AUDITED` | This cycle is complete. Ask if the user wants to start a new task or re-audit. |
| Missing or other | Report: "STATUS.md is missing or has an unrecognized state. Check `.agents/plans/current/`." |

If `.agents/plans/current/.session` exists, read it to know where the original Antigravity brain artifacts live — useful for cross-referencing if the mirrored copies seem incomplete.

---

## Phase 1: Plan Review

Triggered when STATUS is `PLANNING_READY`.

The goal of this phase is to catch issues before a single line of code is written. Antigravity plans can have logical gaps, miss edge cases, or propose patterns inconsistent with the existing codebase. A 5-minute review now saves a 30-minute fix later.

### Step 1: Read the Plan and Project Rules

Read these files in full:
- `.agents/plans/current/implementation_plan.md`
- `.agents/plans/current/task.md` (if it exists)
- `CLAUDE.md` (project-level instructions — the plan must conform to these)
- `.agents/AGENTS.md` (Antigravity's own rules — check it followed its own instructions)

### Step 2: Understand the Codebase Context

For each file the plan proposes to modify or create:
- Read the current state of that file (if it exists)
- Note existing patterns: how are imports organized? What component pattern is used? How is state managed?
- Check if the proposed changes align with the project's architecture and conventions

This step is critical: you can't judge whether a proposed change is consistent if you haven't seen what's already there.

### Step 3: Analyze the Plan

Evaluate the plan against these criteria, in priority order:

1. **Correctness** — Do the proposed changes actually achieve the stated goal? Are there logical gaps where Step B depends on Step A but Step A isn't handled?
2. **Consistency** — Do the changes follow existing codebase patterns? A plan that introduces a different state management pattern or component style than the rest of the project is a red flag — it creates fragmentation that hurts maintainability.
3. **Completeness** — Are edge cases covered? Error states? Loading states? Empty states? What happens if the API call fails? What does the user see while data loads?
4. **Scope** — Is the plan over-engineered (unnecessary abstractions, premature generality) or under-scoped (missing related changes that will break)?
5. **Reusability** — Does the plan reuse existing components, hooks, and utilities? If it reinvents something the codebase already has, flag it — duplication is worse than a suboptimal abstraction.
6. **Risk** — What could break? Are there implicit dependencies on other parts of the system? Does it touch shared layout components, auth, or routing?

Also check the plan against any rules in `CLAUDE.md`. For example, if CLAUDE.md says "always check the best way to structure a role-based UI component," verify the plan addresses role-based rendering if the feature involves multiple roles.

### Step 4: Write the Review

Write `.agents/plans/current/plan-review.md`. The review must be actionable — every issue should include a concrete fix, not just a complaint.

Use this structure:

```markdown
# Plan Review — [One-line task summary]

## Verdict: APPROVED | CHANGES REQUESTED

Use APPROVED only when the plan has zero issues. Anything else is CHANGES REQUESTED.

## Strengths
- [What the plan gets right — be specific, mention actual details from the plan]

## Issues to Address

### [Category: e.g., Missing Edge Case, Inconsistent Pattern, Scope Problem]
- **Location**: [file path or plan section]
- **Problem**: [what's wrong and why it matters]
- **Suggestion**: [concrete fix, with a code sketch if helpful]

## Optional Improvements
- [Lower-priority suggestions that aren't blockers]
```

Example of a well-written issue:

```
### Missing Error State
- **Location**: AdminDashboard.tsx — employee creation flow
- **Problem**: The plan shows the success path (form submit → close drawer → refresh list) but doesn't address what happens when the API returns an error. The user would see the drawer close with no feedback and the list wouldn't update.
- **Suggestion**: Keep the drawer open on error, display the server error message above the submit button, and do not clear the form. The existing `error` state from the `useEmployeeForm` hook can be reused — just conditionally render it in the drawer.
```

### Step 5: Update Status

Change `.agents/plans/current/STATUS.md` to `PLANNING_REVIEWED`.

Tell the user: "Review written to `.agents/plans/current/plan-review.md`. Let Antigravity implement (it will incorporate the suggestions), then invoke me again with `/antigravity-review` to audit the result."

---

## Phase 2: Walkthrough Audit

Triggered when STATUS is `DONE`.

The goal of this phase is to verify that Antigravity actually did what it claimed, didn't break anything, and didn't miss anything. Walkthroughs are marketing documents — they highlight successes and gloss over gaps. Your job is to be the skeptic.

### Step 1: Read Everything

Read:
- `.agents/plans/current/walkthrough.md`
- `.agents/plans/current/task.md`
- `.agents/plans/current/implementation_plan.md` (compare intent vs. outcome)
- `.agents/plans/current/plan-review.md` (check if your review suggestions were incorporated)

### Step 2: Cross-Check Claims Against Code

For every claim in the walkthrough about what was changed:
- Open the actual file and verify the change exists
- Check that the implementation matches the description
- Flag discrepancies. For example: the walkthrough says "full-width responsive grid with `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`" but the actual code uses a different grid configuration.

Also check for claims that are vague enough to be meaningless. "Enhanced card elements with interactive micro-animations" — if this is 2 lines of CSS transition, call it out. Vague claims are a common Antigravity pattern worth logging.

### Step 3: Check for Missing Tests

Antigravity often reports "all existing tests pass" without adding tests for the new code. Check:
- Did any new components, hooks, or utilities get created without corresponding test files?
- Did existing tests get updated to cover the new behavior?
- If no new tests were added, flag this in the learnings log and the audit fixes.

### Step 4: Verification

Discover the project structure first, then run appropriate checks:

- Check `package.json` at the root and in workspace directories to understand the monorepo layout
- Run the TypeScript compiler in each workspace that was modified: `npx tsc --noEmit`
- Run the test suite: `npm run test` (in the relevant workspace, or at root if it's a unified command)
- Run the build if the project has one: `npm run build`

If any check fails, investigate the error — don't just report it. The error might be from Antigravity's changes or a pre-existing issue. Only fix errors introduced by the current changes.

### Step 5: Fix Issues Found

For each issue:
- Fix it directly in the code
- Keep fixes minimal — fix the bug, don't refactor the neighborhood
- After all fixes, re-run verification to confirm nothing is still broken

If you find a pre-existing issue unrelated to Antigravity's changes, note it but don't fix it — that's scope creep.

### Step 6: Update Artifacts

Append a section to the walkthrough documenting fixes:

```markdown
## Audit Fixes (Claude Code)

### [Fix category]
- **What was wrong**: [description]
- **What was changed**: [file and change summary]
- **Why**: [root cause]
```

Update the task checklist if any tasks were re-done or found to be incomplete.

### Step 7: Update the Learnings Log

If Antigravity made mistakes that follow a recognizable, repeatable pattern, append to `.agents/plans/antigravity-learnings.md`. This log compounds over time — it's the most valuable output of this pipeline because it makes Antigravity better with every cycle.

Format each entry so it can be directly pasted into `.agents/AGENTS.md` as a rule:

```markdown
## [YYYY-MM-DD] [One-line task description]

### Pattern: [Name the pattern]
- **What happened**: [Specific instance — what Antigravity did in this session]
- **Root cause**: [Why this happens — e.g., "Antigravity focuses on the happy path and skips error/loading/empty states"]
- **Fix applied**: [What Claude Code changed]
- **Rule to add**: "[Actionable instruction for AGENTS.md, e.g., 'Before marking a task complete, verify that every new component handles: loading, error, empty, and success states.']"
```

If a pattern already appears in the log, add a new dated entry under the same pattern heading. Seeing the same pattern recur with timestamps is a strong signal that it needs to be added to AGENTS.md rules.

### Step 8: Clean Up

Change `.agents/plans/current/STATUS.md` to `AUDITED`.

---

## Shared Principles

These aren't rigid rules — they're heuristics that make the review more valuable.

- Focus on **technical correctness**, not tone or style. A plan written in flowery language with sound engineering is good. A plan written beautifully with logical gaps is dangerous.
- **Be specific.** "This could be better" is useless. "This `useEffect` has a missing dependency on `employeeId` — it won't re-run when navigating between employees" is useful.
- **Verify, don't trust.** The walkthrough says the build passed. Run it yourself. The plan claims 42 tests pass. Count them.
- **Fix the issue, not the file.** If Antigravity introduced a bug, fix that bug. Don't also clean up nearby code, rename variables, or "improve" unrelated things. Surgical fixes are easier to review and won't introduce new issues.
- **Surface patterns, not just instances.** One missing error state is a bug. Five missing error states across different components is a pattern worth logging.
