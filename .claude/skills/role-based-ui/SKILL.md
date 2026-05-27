---
name: role-based-ui
description: Design, implement, audit, or refactor role-based architectures, multi-role client-side UIs, and secure server-side APIs. Use this skill whenever the user mentions RBAC, ABAC, user roles (Admin, Editor, Sales Representative, Manager), permission checks, auth middleware, separating React business logic from presentation, Capacitor native responsive UI, adaptive design (Cupertino/Material), component reuse, or updating role-based features. Consult this skill if the task involves creating or editing routes, handlers, or UI elements that vary by role or user level.
---

# Role-Based UI and Security Skill

This skill provides a comprehensive architecture and design standard for building role-adaptive client-side applications (React + Vite + Capacitor) and securing them with zero-trust server-side APIs.

---

## Core Philosophy

1. **Zero-Trust Frontend**: Any client-side authorization (e.g., hiding a button, restricting a route) is purely for **User Experience (UX)**. Real security **must** be enforced on the backend at the database and handler level.
2. **Strict Logic Separation**: Keep domain business logic completely out of visual React components. Visual components are purely stateless "skins" (or highly reusable presenters), while custom hooks act as headless controllers managing state and side effects.
3. **Reuse First (Capacitor & Shadcn)**: Never build a UI element from scratch if an existing one can be found in the project's native Capacitor components or if it can be added and composed using the `shadcn` skill.

---

## Mandatory Agent Workflow

When invoked to create, edit, or refactor any role-based or permissioned feature, you **must** follow these steps:

### Step 1: Pre-Check & Component Reuse First
Before writing a single line of new UI code, check for existing components:
1. **Search existing components**: Look in the local codebase (e.g., `client/src/components` or native Capacitor widgets) for similar UI elements.
2. **Utilize Shadcn skill**: If a new component is needed, first invoke the `shadcn` skill to search the design system library or registry for high-quality, pre-built components (e.g., dialogs, select dropdowns, tables, drawers).
3. **Very rarely should we create a component from scratch**. Always reuse and compose existing UI primitives.

### Step 2: Plan Component Structure
- Keep visual presentation separate from business logic.
- Design the components to accept pure presentation props, allowing styling and layouts to be changed/experimented with independently of the backend logic.
- Read `references/client-side.md` for React, Vite, and Capacitor low-level patterns.

### Step 3: Implement Server-Side Verification
- Ensure that the API route has a corresponding authorization middleware checking granular permissions (`orders.create`, `visits.view`) rather than static role strings (`user.role === 'admin'`).
- Validate that database queries enforce tenancy and ownership boundaries.
- Read `references/server-side.md` for secure RBAC/ABAC design.

### Step 4: Consult and Update the Living 'Gotchas' Reference
- Review the **Gotchas & Lessons Learned** section below before finishing.
- **CRITICAL**: If the user reports an issue, requests a redesign due to a flaw, or points out a mistake in your role-based implementation, you **must** immediately document that mistake, the resolution, and how to avoid it in the **Gotchas & Lessons Learned** section below to keep this skill dynamic and self-correcting.

---

## Gotchas & Lessons Learned (Living Reference)

*This section must be dynamically updated with real-world issues, user corrections, or platform-specific edge cases as they arise.*

### Client-Side Gotchas
*   **Capacitor Native Keyboard Overlap**: When forms with complex input requirements are rendered in native webviews, ensure input fields do not get covered by the native software keyboard. Use standard viewport heights (`dvh`) or Capacitor Keyboard plugins to adjust layout.
*   **Route Guards and Flash of Unauthorized Content**: Synchronize your authentication state before rendering layout guards to prevent a "flash" of the 403 page or login screen during hot reloads or state resolution.

### Server-Side Gotchas
*   **Granular Permissions > Hardcoded Roles**: Avoid hardcoding `if (user.role === 'admin')` in endpoints. This breaks down when new hybrid roles (e.g., "Regional Lead") are introduced. Always map roles to granular permissions on the database/backend and check permissions (e.g., `hasPermission('orders:delete')`).
*   **Payload Manipulation Auditing**: Ensure that when a user updates resource `A` via `PUT /api/resources/:id`, the route validates that the user actually owns/has access to resource `:id` (ABAC) and that the `:id` parameter matches the payload's ID to prevent ID-spoofing privilege escalation.
