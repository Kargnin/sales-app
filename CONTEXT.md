# Context

## Domain Glossary

### Actors

- **Admin** (Business Administrator): The business owner managing the enterprise. Works on laptops/desktop and tablet. Manages employees, approves shops, monitors sales pipelines via a dashboard.
- **Salesman** (Field Salesman): A field worker visiting retail shops to collect soap orders. Uses a mid-to-low range Android phone in bright daylight. Needs a highly visible, fast interface that works offline.
- **Retailer** (Shop Owner): A store owner who views their orders on mobile browsers through secure SMS/WhatsApp links. Needs a simple confirmation screen.

### Core Entities

- **Tenant**: A business organization (e.g., a soap manufacture/distribution company). All data is scoped to a tenant.
- **Shop** (Outlet): A retail store visited by salesmen. Has a name, owner, phone, GPS coordinates, and approval status (approved, pending_approval, rejected).
- **Visit**: A recorded physical check-in at a shop by a salesman. Contains GPS coordinates, photo evidence, notes, and a timestamp. Must be GPS-verified.
- **Order**: A purchase placed at a shop. Has a source (salesman, whatsapp, meesho, admin_self), status (pending_approval → confirmed → dispatched → delivered), payment status, line items, and total amount.
- **Product**: An item sold (e.g., a specific soap SKU). Has a name, SKU, price, and stock quantity.
- **Payment**: A payment against an order. Has a method (cash, upi, bank_transfer), amount, and date.

### Tangible Artifacts

- **Invoice**: A printable B2B invoice generated for an order, shared with the retailer.
- **Order Confirmation**: A secure link (via SMS/WhatsApp) sent to the retailer to confirm or cancel an order.

## Design System

The app uses the **Warm Tactile Industrial** design system. See the Stitch project for full visual specifications.

- Warm parchment canvas (`#fbfaf9`) — physical, paper-like quality
- White cards (`#ffffff`) with 1px stone inset borders (`#f2f0ed`) — no floating shadows
- Midnight (`#121212`) primary CTAs, Ember Orange (`#ff3e00`) accent
- Inter for UI text, Fraunces 500 for display headlines
- 4px base spacing unit, 10px standard radius, pill-shaped interactive elements
