# Phase 5: Multi-Channel Order Connectors & Preprocessing Pipeline

> **Status**: Deferred — Not needed for current release. Will be revisited in a future iteration.

## Overview

Phase 5 was intended to build modular parsers and connector endpoints for ingesting B2B orders from external channels (WhatsApp messages, Meesho CSV/JSON exports) into the SalesApp order pipeline.

---

## Planned Components

### 1. Modular Parsers
- **`whatsappParser.ts`**: Parse raw WhatsApp message text containing order listings. Match product SKUs against the tenant's product catalog, extract quantities, and normalize into `CreateOrderInput` format.
- **`meeshoParser.ts`**: Parse structured Meesho CSV or JSON bulk order datasets. Map Meesho product identifiers to internal SKUs and generate batch order payloads.

### 2. Connector Endpoints (`server/src/routes/connectors.routes.ts`)
- **`POST /api/connectors/whatsapp`** (Admin-only): Accept raw text input, run through `whatsappParser`, return parsed order preview for confirmation, then persist.
- **`POST /api/connectors/meesho`** (Admin-only): Accept JSON/CSV file upload, run through `meeshoParser`, return parsed order preview, then persist.

### 3. Testing
- Vitest mock datasets simulating real WhatsApp message formats and Meesho export schemas.
- Edge cases: duplicate SKUs, missing products, malformed input, partial matches.

---

## Design Considerations

- Parsers should be pure functions (no side effects) for easy unit testing.
- Each parser returns a standardized `ParsedOrderResult` with matched items, unmatched items, and confidence scores.
- Admin reviews parsed results in a confirmation UI before orders are committed to the database.
- `orderSource` field in the orders table already supports `'whatsapp'` and `'meesho'` enum values.

---

## Why Deferred

The business owner currently manages WhatsApp and Meesho orders manually. The salesman field-ordering workflow (Phase 1-4) is the critical path. Connectors will be implemented when the volume of external channel orders justifies the engineering investment.
