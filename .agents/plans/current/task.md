# Task Checklist - UI/UX Improvements 1 to 3

- [ ] Add `additional_owners` column to `shops` table in `server/src/db/schema.ts` and `server/src/db/migrate.ts`
- [ ] Update `step1ShopIdentitySchema`, `createShopSchema`, `updateShopSchema` in `packages/shared/src/schemas/shop.schemas.ts`
- [ ] Update `POST /api/shops` and `PATCH /api/shops/:id` handlers in `server/src/routes/shops.routes.ts`
- [ ] Run migration `npx tsx src/db/migrate.ts` and server tests `npx vitest run`
- [ ] Update `Step1ShopIdentity.tsx` with `useFieldArray` for "+ Add Owner" dynamic fields
- [ ] Update `Step2ShopLocation.tsx` with `expo-location` reverse geocoding auto-fill & interactive mini-map picker
- [ ] Update `client/app/(admin)/shops/new.tsx` payload
- [ ] Add tests in `WizardShopFlow.test.tsx` and run Jest (`npx jest`) & `npx tsc --noEmit`
