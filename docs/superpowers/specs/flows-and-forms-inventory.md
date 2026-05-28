# Flows & Forms Inventory

Derived from Stitch project `2048573934882273867` on 2026-05-28.

## Screen Map

### Admin Screens

| Screen | Stitch ID | Forms? |
|---|---|---|
| Login | (in code) | email + password |
| Admin Dashboard | 7f9af1197a4f | read-only |
| All Shops (list) | d188e36f10d9 | read-only |
| Shop Approvals | 625a19bf96eb | read-only (approve/reject actions) |
| Shop Details | 76c13f3a4bef | read-only |
| Enhanced Shop Details | 275ed573450f | read-only |
| Order & Invoice Details | 032b0d6f8d4f | read-only |
| Order & Invoice (back btn) | 5b898dadbe7c | read-only |
| Product Catalog | effb93b02e79 | read-only |
| Product Details | b8f4462b1ee7 | read-only |
| Salesman Management | e3687112cded | list + actions |
| Salesman Profile | 81d6c3bc7501 | read-only |
| Edit Profile | 34ea16e78723 | **form** |
| Visit History Log | aa353fab4b8c | read-only |

### Salesman Screens

| Screen | Stitch ID | Forms? |
|---|---|---|
| Login | (in code) | email + password |
| Shop Discovery & Map | 70d34e2de3bb | read-only |
| Register New Shop | cd0783d79fb7 | **form** — name, owner, phone, GPS |
| Shop Registration Success | 02a9140688d5 | read-only |
| Start Visit Registration | 08ae082b0f8c | **form** — GPS check-in, photo |
| Visit Registration Form | 51478e190cc6 | **form** — visit data |
| Visit Registration w/ Order | a5f70f2f85cf | **complex form** — line items |
| Visit Success Summary | d23ce25e15d2 | read-only |
| Visit Success w/ Order | 5ad4ab1e632f | read-only |
| Review Order Summary | b64145adaa31 | **form** — review + confirm |
| Product Catalog | effb93b02e79 | read-only |
| Product Details | b8f4462b1ee7 | read-only |
| Edit Profile | 34ea16e78723 | **form** |

## Forms Classification

### Simple forms (2-5 fields, no nesting)
1. **Login** — email, password
2. **Edit Profile** — name, phone, photo
3. **Register New Shop** — name, owner, phone, GPS coordinates

### Medium forms (5-10 fields, conditional)
4. **Start Visit Registration** — GPS, photo evidence, notes, timestamp
5. **Visit Registration Form** — shop select, check-in data, notes

### Complex forms (dynamic fields, arrays, multi-step)
6. **Visit Registration with Order** — visit data + dynamic order line items (product, qty, price)
7. **Review Order Summary** — order confirmation, payment method, amount

## Validation Requirements by Form

### Login
- Email: required, valid email format
- Password: required, min 6 chars

### Edit Profile
- Name: required, min 2 chars
- Phone: optional, valid phone format
- Photo: optional, file size limit

### Register New Shop
- Shop name: required
- Owner name: required
- Phone: required, valid phone
- GPS: auto-captured, required

### Visit Registration
- Shop: required (selected from list/map)
- Photo: required (camera capture)
- Notes: optional
- GPS: auto-captured, required, accuracy threshold

### Visit Registration with Order
- All visit fields above
- Line items: at least 1 required
  - Product: required (from catalog)
  - Quantity: required, positive integer
  - Price: auto-filled from product, read-only

### Review Order Summary
- Payment method: required (cash/UPI/bank transfer)
- Amount: auto-calculated, read-only
- Confirmation: required toggle/checkbox
