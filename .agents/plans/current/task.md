# Task List - Signup & Reset Password Screens (Revised)

Checklist tracking progress of registration, password reset, and salesman invite integrations:

- [x] Add backend endpoint for `/reset-password` in `auth.routes.ts` <!-- id: 0 -->
- [x] Add validation schemas `signupSchema`, `resetPasswordSchema`, and `inviteAcceptSchema` in `validation.ts` <!-- id: 1 -->
- [x] Implement `register`, `registerSalesman`, and `resetPassword` actions in `authStore.ts` <!-- id: 2 -->
- [x] Implement `SignupForm` feature component in `signup-form.tsx` <!-- id: 3 -->
- [x] Implement `ResetPasswordForm` feature component in `reset-password-form.tsx` <!-- id: 4 -->
- [x] Update `login-form.tsx` navigation hooks for signup and password reset links <!-- id: 5 -->
- [x] Configure routing layout in `client/app/_layout.tsx` to include `signup`, `reset-password`, and `invite` paths without auto-login-redirects <!-- id: 6 -->
- [x] Add file routes `signup.tsx` and `reset-password.tsx` in `client/app/` <!-- id: 7 -->
- [x] Implement Invite Generator on Admin Team Screen `client/app/(admin)/team/index.tsx` <!-- id: 8 -->
- [x] Add dynamic invite acceptance route `client/app/invite/[token].tsx` and verification UI <!-- id: 9 -->
- [x] Run full verification checks and verify TS compilation and Expo server state <!-- id: 10 -->
