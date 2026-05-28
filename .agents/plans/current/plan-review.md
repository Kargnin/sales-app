# Plan Review — Signup & Reset Password Screens

## Verdict: CHANGES REQUESTED

The plan covers the basic business-owner signup and reset password flows but completely misses the employee invite registration flow the user explicitly requested. Two registration paths exist in the backend — the plan only handles one.

## Strengths

- Correctly identifies the Stitch design screens for Sign Up (`8aae2f460fd4`) and Reset Password (`f68464544b5f`)
- Good reuse of the existing `FormField` component and `react-hook-form` + `zod` pattern established in the login form
- Reset password multi-stage view (form → success "Link Sent!" screen) is a well-reasoned UX decision
- Creates proper Expo Router route files (signup.tsx, reset-password.tsx) rather than inlining screens

## Issues to Address

### 1. Missing Employee Invite Registration Flow
- **Location**: Entire plan — not addressed
- **Problem**: The user explicitly asked for "admin to add new employees, either create creds for them or share an invite link." The backend already has `/auth/verify-invite` and `/auth/register-salesman` endpoints. The plan proposes only the business-owner signup (`/auth/register`), ignoring the second registration path entirely. The Stitch "Salesman Management" screen (`e3687112cded`) exists for the admin to manage employees.
- **Suggestion**: Add two items to the plan:
  1. **Admin-side**: A new screen or modal for employee creation — admin enters email/phone, generates an invite link/token. This doesn't need a full Stitch screen design yet but the store action and backend call should be wired.
  2. **Salesman-side**: An invite-acceptance screen (`/invite/<token>`) that uses the existing `FormField` pattern to let the salesman set a username + password, calling `registerSalesman(token, username, password)` on submit.

### 2. Signup Schema Mismatch with Backend
- **Location**: validation.ts — proposed signupSchema
- **Problem**: The plan proposes `{ fullName, businessName, email, password }` but the backend `/auth/register` expects `{ businessName, username, email, phone, password }`. The plan says it will "derive username from fullName" (e.g., `fullName.toLowerCase().replace(/\s+/g, ".")`), but:
  - The backend requires a `username` field — the derived value could collide with an existing username with no fallback
  - There's no `phone` field in the schema even though the backend accepts it
  - The Stitch design for Sign Up should be cross-referenced to confirm which fields are shown
- **Suggestion**: Align the schema with the actual backend contract:
  ```typescript
  export const signupSchema = z.object({
    businessName: z.string().min(2, "Business name is required"),
    username: z.string().min(2, "Username is required"),
    email: z.string().email("Enter a valid email address"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
  });
  ```
  The `fullName` field should be `username` to match the backend contract directly.

### 3. authStore `register` Action — Derivation Logic Fragile
- **Location**: authStore.ts — proposed register action
- **Problem**: Automatically deriving `username` from `fullName` inside the store action hides complexity. If the derived username is taken, the API returns a 400 but the user has no way to change it — they can't edit the auto-derived username.
- **Suggestion**: Either (a) expose `username` as an explicit field in the form and pass it directly, or (b) if keeping auto-derivation, handle the "username taken" error by prompting the user to enter a custom username.

### 4. Layout Redirect — Incomplete Bypass List
- **Location**: `_layout.tsx` — AuthRedirect component
- **Problem**: The plan says to bypass redirect when segments include `"signup"` or `"reset-password"`, but the current code uses a single-equality check: `segments[0] === "login"`. The plan doesn't specify how to extend this. Additionally, if an invite acceptance route (`/invite/[token]`) is added, this also needs to be in the bypass list.
- **Suggestion**: Replace the single check with an array:
  ```typescript
  const publicRoutes = ["login", "signup", "reset-password"];
  const inAuthGroup = publicRoutes.includes(segments[0]);
  ```

### 5. No Loading/Error/Success States Described
- **Location**: signup-form.tsx, reset-password-form.tsx — not addressed
- **Problem**: The plan describes the happy path only. What happens when:
  - The signup API returns a 400 (username taken, email taken)?
  - The reset password API call fails (network error, server down)?
  - The form is submitting (should the button show a spinner)?
- **Suggestion**: Each form should handle:
  - **Loading**: `formState.isSubmitting` drives a loading spinner on the submit button (reuse the existing `Button` `loading` prop)
  - **Error**: Server-side errors set via `setError()` on the relevant field (same pattern as login-form.tsx)
  - **Success**: Signup auto-navigates to dashboard (already handled by auth state change triggering AuthRedirect). Reset password shows a success card ("Link Sent!") as described in the plan.

## Optional Improvements

- **Shared schema alignment**: The backend imports `registerBusinessSchema` from `@sales-app/shared` but that package doesn't exist on disk. Consider whether the Zod schemas should live in a shared location between client and server rather than duplicating in `client/src/lib/validation.ts`.
- **Accessibility**: The plan mentions "add accessibility attributes" for the signup form but doesn't specify what — `accessibilityRole` and `accessibilityLabel` on interactive elements per AGENTS.md.
- **Reset password success state**: The plan mentions a "cute Success State card" — ensure this matches the Stitch design's visual language (stone inset border, surface container, Fraunces for the success headline).
