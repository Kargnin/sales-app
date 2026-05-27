# Server-Side Role-Based Security & API Design

This reference outlines secure patterns for designing REST APIs, authorization pipelines, and database query wrappers that prevent privilege escalation, data leaks, and horizontal/vertical permission bypasses.

---

## 1. Zero-Trust Access Control (RBAC vs. ABAC)

Real security is enforced on the server-side. All endpoints must act under a **Zero-Trust** model: assume the client payload is malicious, altered, or spoofed.

### A. Role-Based Access Control (RBAC)
- **Problem**: Hardcoding roles (`user.role === 'admin'`) makes the API rigid. Introducing a new role requires searching and editing numerous backend route handlers.
- **Solution**: Decouple roles from permissions. Map users to Roles, and map Roles to static, granular Permissions (e.g., `orders:create`, `visits:delete`). The backend checks for specific **Permissions**, not roles.

### B. Attribute-Based Access Control (ABAC)
- **Problem**: A Sales Representative has the `orders:update` permission, but they should only be able to update orders **assigned to them or their department**. Granular permissions are not enough; we need context.
- **Solution**: ABAC evaluates attributes of the subject (user), object (resource to access), and environment (IP, time). Combine RBAC check with resource ownership check.

---

## 2. Secure Middleware Pipeline (Express.js Examples)

API handlers must execute through a structured security pipeline:
$$\text{Request} \longrightarrow [\text{Authentication}] \longrightarrow [\text{Granular Authorization (RBAC)}] \longrightarrow [\text{Resource Ownership (ABAC)}] \longrightarrow [\text{Validation}] \longrightarrow \text{Handler}$$

### A. Granular Permission Checker Middleware
```typescript
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
    tenantId: string;
  };
}

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || [];
    
    const hasAccess = userPermissions.includes(permission) || userPermissions.includes('*');

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`
      });
    }

    next();
  };
}
```

### B. Ownership Checker Middleware (ABAC Example)
Ensures a Sales Representative can only access their own customer records or visits.

```typescript
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { db } from '../db'; // Example database connection

export function requireResourceOwnership(resourceTable: string, ownerField: string = 'userId') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const resourceId = req.params.id;

    if (!userId || !resourceId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Missing user context or resource ID' });
    }

    // Bypass check for high-level roles (e.g. admin)
    if (req.user?.permissions.includes('*') || req.user?.role === 'admin') {
      return next();
    }

    try {
      // Direct SQL query parameterized to prevent injection
      const [resource] = await db.query(
        `SELECT * FROM ?? WHERE id = ? LIMIT 1`,
        [resourceTable, resourceId]
      );

      if (!resource) {
        return res.status(404).json({ error: 'Not Found', message: 'Resource not found' });
      }

      // Check ownership
      if (resource[ownerField] !== userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource.'
        });
      }

      next();
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
```

---

## 3. Threat Modeling & Validation Defensive Checklist

### A. Payload Spoofing (ID Incongruency)
A common exploit is sending a PUT request to `/api/orders/45` but passing `{ "id": 12 }` or `{ "userId": "another-user-id" }` in the JSON request body.
- **Rule**: Never trust client-sent IDs in the body if they dictate authority.
- **Rule**: Override user-associated properties directly from the authenticated session (`req.user.id`), ignoring values provided by the client body.

```typescript
// SECURE: Disregard body userId, assign it from req.user context
router.post('/orders', requirePermission('orders:create'), (req: AuthenticatedRequest, res) => {
  const newOrder = {
    ...req.body,
    userId: req.user!.id, // Enforced from server authentication, NOT client body
    tenantId: req.user!.tenantId
  };
  
  // Insert order...
});
```

### B. Over-Posting (Mass Assignment Vuln)
If an attacker sends a POST to `/api/users` with `{ "username": "alice", "role": "admin" }`, a naive database insert like `INSERT INTO users SET ?` can let them elevate their role.
- **Rule**: Use strict schema validation libraries (e.g., **Zod**, **Joi**) to validate request payloads.
- **Rule**: Always construct safe insert records by explicitly selecting allowed fields.

```typescript
import { z } from 'zod';

const CreateOrderSchema = z.object({
  customerId: z.string().uuid(),
  totalAmount: z.number().positive(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive()
  }))
});

// Handler
router.post('/orders', (req, res) => {
  // Parse body safely - rejects any extra properties like 'status' or 'id'
  const parsedBody = CreateOrderSchema.parse(req.body);
  
  // Save to DB...
});
```

### C. Database Tenancy Filtering
If the application houses multiple enterprise clients or separate regions, ensure data partitioning is enforced in every query:
- Wrap your database queries to automatically append `AND tenantId = ?` using the logged-in user's tenant context.
- Never write database fetches without explicit tenant isolation keys.
- Write unit/integration tests that attempt to fetch resources from dynamic cross-tenants to prove isolation holds.
