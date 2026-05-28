# Implementation Plan - Signup & Reset Password Screens (Revised)

Implement premium, tactile, and animated "Sign Up", "Reset Password", "Admin Invite Generation", and "Salesman Invite Acceptance" screens in the Expo app based on the Stitch designs, with full backend integration, updated routing, and robust state actions.

## User Review Required

> [!IMPORTANT]
> This revised plan fully addresses the two registration paths:
> 1. **Business-Owner Registration (`/auth/register`)**: Standard registration form for new admin users and tenants. Exposes `Username` explicitly in the form to align with the backend contract and prevent username collision issues.
> 2. **Employee Registration via Invite (`/auth/register-salesman`)**: The admin generates a secure JWT invite link, and the salesman accepts the invitation, verifies the invite details (`/auth/verify-invite`), and registers a salesman account.

## Proposed Changes

We will extend our validation schemas, update `useAuthStore` actions, build out components and pages matching Stitch design screens, integrate navigation flow, and configure the backend endpoint.

---

### [Component Name] backend-auth

#### [MODIFY] [auth.routes.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/routes/auth.routes.ts)
- Add a new `/reset-password` POST route:
  - Takes `{ email }` in `req.body`.
  - Simulates sending a password reset email by logging the action.
  - Returns a standard success response: `{ message: 'Password reset link sent successfully' }`.

---

### [Component Name] client-validation

#### [MODIFY] [validation.ts](file:///Users/bhushanmalani/Code/Sales%20App/client/src/lib/validation.ts)
- Define `signupSchema` with zod validations matching the backend register contract:
  - `businessName`: string, min 2 chars.
  - `username`: string, min 3 chars.
  - `email`: string, optional/empty, must be valid email format if provided.
  - `phone`: string, optional.
  - `password`: string, min 8 chars.
- Define `resetPasswordSchema`:
  - `email`: string, must be valid email format.
- Define `inviteAcceptSchema`:
  - `username`: string, min 3 chars.
  - `password`: string, min 8 chars.
  - `email`: string, optional/empty, must be valid email format if provided.
  - `phone`: string, optional.

---

### [Component Name] client-auth-store

#### [MODIFY] [authStore.ts](file:///Users/bhushanmalani/Code/Sales%20App/client/src/stores/authStore.ts)
- Add the `register` action:
  - Takes `businessName`, `username`, `email`, `phone`, `password`.
  - Calls `/auth/register` via `apiClient`.
  - Saves returned tokens to secure storage and sets authentication states.
- Add the `registerSalesman` action:
  - Takes `token`, `username`, `password`, `email`, `phone`.
  - Calls `/auth/register-salesman` via `apiClient`.
  - Saves returned tokens to secure storage and sets salesman authentication states.
- Add the `resetPassword` action:
  - Takes `email`.
  - Calls `/auth/reset-password` via `apiClient` to trigger simulated email.

---

### [Component Name] client-screens

#### [NEW] [signup.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/app/signup.tsx)
- Create the React Native / Expo signup entry screen rendering `SignupForm`.

#### [NEW] [reset-password.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/app/reset-password.tsx)
- Create the React Native / Expo reset password entry screen rendering `ResetPasswordForm`.

#### [NEW] [invite/[token].tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/app/invite/%5Btoken%5D.tsx)
- Create the React Native / Expo dynamic invitation acceptance route.
- Verifies the invite token on mount using `/auth/verify-invite` (fetches `tenantName` and `role`).
- If token is loading: Render `ActivityIndicator` in a beautiful sand/stone centered spinner.
- If token is invalid or expired: Show an "Invalid Invitation" card matching the tactile design with a back to login button.
- If token is valid: Render a custom registration form "Join the [TenantName] Family" where the salesman can fill `username`, `password`, optional `email`, and `phone` to register.

#### [NEW] [signup-form.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/src/features/auth/signup-form.tsx)
- Implement signup screen matching Stitch screen design `8aae2f460fd44d7385ce4ee7f821addd`.
- Include the "Join the Family" heading, a playful tactile icon container, and input fields for Username, Business Name, Email, and Password (with toggle visibility).
- Handle submit action by calling `useAuthStore.getState().register()`.
- Bind button `loading` spinner to `formState.isSubmitting`.
- Set server-side errors on fields using React Hook Form's `setError`.

#### [NEW] [reset-password-form.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/src/features/auth/reset-password-form.tsx)
- Implement reset password screen matching Stitch screen design `f68464544b5f4af4959480d906431aac`.
- Render a transactional back arrow in the upper header.
- Include the `mascot_partner.png` with a "mail" icon badge.
- Include input field for Email Address.
- Support a multi-stage view: show success feedback card ("Link Sent!") with a custom stone inset border.

#### [MODIFY] [login-form.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/src/features/auth/login-form.tsx)
- Modify the "Forgot Password?" touchable to navigate to `/reset-password` instead of showing a static Alert.
- Modify the "Create an account" link to navigate to `/signup`.

#### [MODIFY] [index.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/app/(admin)/team/index.tsx)
- Upgrade the placeholder `TeamScreen` to render an invite generator component.
- The Admin can click "Generate Salesman Invite Link" which fires a POST to `/api/users/generate-invite`.
- Shows a Stone Inset card containing the invite link (constructed using the current Expo API URL base + `/invite/[token]`).
- Includes a copy button using React Native's `Clipboard` utility and shows visual copied confirmation.

#### [MODIFY] [_layout.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/app/_layout.tsx)
- Update `AuthRedirect` logic to bypass redirecting to login when segments include public-accessible pages:
  ```typescript
  const publicRoutes = ["login", "signup", "reset-password", "invite"];
  const inAuthGroup = publicRoutes.includes(segments[0]);
  ```
- Add stack screen definitions for `"signup"`, `"reset-password"`, and `"invite/[token]"` inside the root stack router layout.

---

## Verification Plan

### Automated Tests
- Build and compile check the TypeScript project:
  ```bash
  cd client && npx tsc --noEmit
  ```
- Verify the Expo compiler runs:
  ```bash
  cd client && npx expo start --web
  ```

### Manual Verification
- Navigate to the login page and test clicking "Forgot Password?" to confirm transitions to the reset password page.
- Test submitting an email on the reset password screen; verify backend receives the call and that a cute Success State card is rendered.
- Test transitioning to the signup screen, fill valid fields, and verify a new business tenant and admin user are registered, tokens are saved, and you are successfully auto-logged into the admin dashboard!
- Log in as admin, navigate to the Team tab, generate an invite link, and copy it.
- Open the copied invite link path (e.g. `/invite/[token]`), verify the verification API verifies it, fill details, submit, and confirm that the salesman registers and successfully logs in!
