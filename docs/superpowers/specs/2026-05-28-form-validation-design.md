# Form Validation System

Date: 2026-05-28 | Status: Approved

## Summary

Replace manual `useState`-based form validation with react-hook-form + zod. Start with the login form, establishing a reusable FormField pattern for all 7 forms in the app.

## Decisions

| Decision | Choice |
|---|---|
| Form state ownership | react-hook-form (library-managed, not Zustand) |
| Validation | Zod schemas with `@hookform/resolvers` |
| Error display | Inline: ember border + caption below each input |
| Reusable component | `FormField` wrapping Controller + TextInput |
| Offline | Deferred — schemas are client-side only for now |
| Line items | `useFieldArray` for dynamic rows (future forms) |

## Dependencies to add

- `react-hook-form` — form state, submission, validation lifecycle
- `@hookform/resolvers` — bridges Zod schemas into react-hook-form
- `zod` — schema definition, TypeScript inference

## Files

| File | Action | Purpose |
|---|---|---|
| `client/src/lib/validation.ts` | New | All Zod schemas (login first, then registerShop, visit, order) |
| `client/src/components/form/FormField.tsx` | New | Controlled TextInput + label + inline error, NativeWind-styled |
| `client/src/components/form/index.ts` | New | Barrel export |
| `client/src/features/auth/login-form.tsx` | Rewrite | useForm + zodResolver + FormField, removing manual state |

## `FormField` API

```typescript
interface FormFieldProps {
  name: string;           // field name (matches zod schema key)
  control: Control;       // from useForm()
  label: string;          // displayed above input
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  rightIcon?: ReactNode;  // e.g., password visibility toggle
}
```

**States:** default (stone border), focused (midnight border), error (ember border + caption text below), disabled

## Validation schemas

```typescript
// loginSchema — email format + password min length
// registerShopSchema — name, owner, phone, GPS (future)
// visitSchema — shop selection, photo, notes (future)
// orderSchema — dynamic line items via z.array() (future)
```

## Login form before/after

**Before:** useState for username/password/error/loading, single error message, manual validation
**After:** useForm + zodResolver, per-input inline errors, formState.isSubmitting drives button

## Scope

This spec covers the validation infrastructure + login form rewrite. The other 6 forms are implemented later following the same pattern.
