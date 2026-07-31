# Implementation Plan - Shop Registration UI & UX Improvements (Items 1-3)

Implement the top 3 UI/UX recommendations for the Shop Registration flow:
1. **Interactive Map Location Pinning**
2. **Dynamic Additional Owners / Co-Owners Support** (`useFieldArray`)
3. **GPS Reverse Geocoding Auto-Fill** (`expo-location`)

---

## Proposed Changes

### [Component: Server & Shared Package]

#### [MODIFY] [schema.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/db/schema.ts)
- Add `additionalOwners: text('additional_owners')` (JSON array string) to `shops` table.

#### [MODIFY] [migrate.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/db/migrate.ts)
- Add migration `ALTER TABLE shops ADD COLUMN additional_owners TEXT`.

#### [MODIFY] [shop.schemas.ts](file:///Users/bhushanmalani/Code/Sales%20App/packages/shared/src/schemas/shop.schemas.ts)
- Add `additionalOwners` array schema to `step1ShopIdentitySchema`, `createShopSchema`, and `updateShopSchema`.

#### [MODIFY] [shops.routes.ts](file:///Users/bhushanmalani/Code/Sales%20App/server/src/routes/shops.routes.ts)
- Update `POST /api/shops` and `PATCH /api/shops/:id` handlers to handle `additionalOwners`.

---

### [Component: Client UI & Features]

#### [MODIFY] [Step1ShopIdentity.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/src/features/shops/Step1ShopIdentity.tsx)
- Integrate `useFieldArray` from `react-hook-form` for dynamic `additionalOwners`.
- Add "+ Add Owner" button matching Stitch Step 1 design and trash icon for removing added owners.

#### [MODIFY] [Step2ShopLocation.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/src/features/shops/Step2ShopLocation.tsx)
- Integrate `expo-location` reverse geocoding (`reverseGeocodeAsync`).
- Tapping "Pin GPS Location" fetches position, reverse geocodes formatted address/city/state/pinCode, and auto-populates `react-hook-form` fields.
- Integrate interactive mini-map location picker (`ShopMapCanvas` / `react-native-maps`).

#### [MODIFY] [new.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/app/(admin)/shops/new.tsx)
- Pass `additionalOwners` to `apiClient` POST payload.

#### [MODIFY] [WizardShopFlow.test.tsx](file:///Users/bhushanmalani/Code/Sales%20App/client/src/__tests__/features/WizardShopFlow.test.tsx)
- Add unit tests for `additionalOwners` array validation and geocoding auto-fill state updates.

---

## Verification Plan

### Automated Tests
1. Run server migration and server test suite: `npx vitest run`
2. Run client TypeScript check: `cd client && npx tsc --noEmit`
3. Run client Jest test suite: `cd client && npx jest`

### Manual Verification
- Test Step 1: Click "+ Add Owner", fill additional owner name/phone, delete owner.
- Test Step 2: Click "Pin GPS & Auto-Fill Address". Verify address, city, state, and PIN code auto-fill automatically.
