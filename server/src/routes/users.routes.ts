import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { tenants, users } from '../db/schema.js';
import { createEmployeeSchema } from '@sales-app/shared';
import { authenticate, authorize, tenantScope, fieldGuard, validate } from '../middleware/index.js';
import { config } from '../config.js';

const router = Router();

router.use(authenticate, tenantScope);

// ─── Get Own Profile ────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const tenantId = req.user!.tenantId;

    const dbUser = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenantId, tenantId)),
    });

    if (!dbUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    const { passwordHash, ...userWithoutPassword } = dbUser;
    res.json({
      ...userWithoutPassword,
      tenantName: tenant?.name,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update Own Profile ──────────────────────────────────────────────
router.patch('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const tenantId = req.user!.tenantId;
    const { email, phone, currentPassword, newPassword } = req.body;

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.tenantId, tenantId)),
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updates: Partial<typeof users.$inferInsert> = {};

    if (email !== undefined) updates.email = email || null;
    if (phone !== undefined) updates.phone = phone || null;

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to set a new password' });
        return;
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ error: 'Incorrect current password' });
        return;
      }
      if (newPassword.length < 8) {
        res.status(400).json({ error: 'New password must be at least 8 characters long' });
        return;
      }
      updates.passwordHash = await bcrypt.hash(newPassword, 10);
      (updates as any).tokenVersion = (user.tokenVersion ?? 0) + 1;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No update fields provided' });
      return;
    }

    await db.update(users)
      .set(updates)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)));

    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });

    const { passwordHash, ...safeUser } = updatedUser!;
    res.json({
      ...safeUser,
      tenantName: tenant?.name,
    });
  } catch (error) {
    console.error('Error updating own profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Create Employee (Admin Only) ───────────────────────────────────
router.post(
  '/',
  authorize('admin'),
  fieldGuard({ admin: { reject: ['id', 'tenantId'] } }),
  validate(createEmployeeSchema),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, phone, password, role } = req.body;
    const tenantId = req.user!.tenantId;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      res.status(400).json({ error: 'Username is already taken' });
      return;
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      id: userId,
      tenantId,
      username,
      email: email || null,
      phone: phone || null,
      passwordHash,
      role: role || 'salesman',
      status: 'active',
    });

    res.status(201).json({
      id: userId,
      tenantId,
      username,
      email: email || null,
      phone: phone || null,
      role: role || 'salesman',
      status: 'active',
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── List Employees (Admin Only) ────────────────────────────────────
router.get('/', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;

    const allUsers = await db.select({
      id: users.id,
      tenantId: users.tenantId,
      username: users.username,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.tenantId, tenantId));

    res.json(allUsers);
  } catch (error) {
    console.error('Error listing employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Update Employee Status / Details (Admin Only) ──────────────────
router.patch(
  '/:id',
  authorize('admin'),
  fieldGuard({ admin: { reject: ['id', 'tenantId', 'role', 'username', 'passwordHash'] } }),
  async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const tenantId = req.user!.tenantId;
    const { status, email, phone } = req.body;

    if (req.user!.sub === id && status === 'inactive') {
      res.status(400).json({ error: 'Administrators cannot deactivate their own accounts' });
      return;
    }

    const employee = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.tenantId, tenantId)),
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found in this tenant' });
      return;
    }

    const updates: Partial<typeof users.$inferInsert> = {};
    if (status !== undefined) {
      if (status !== 'active' && status !== 'inactive') {
        res.status(400).json({ error: "Invalid status. Must be 'active' or 'inactive'" });
        return;
      }
      updates.status = status;
    }
    if (email !== undefined) updates.email = email || null;
    if (phone !== undefined) updates.phone = phone || null;

    // Increment tokenVersion to invalidate all existing tokens when deactivating
    if (status === 'inactive' && employee.status !== 'inactive') {
      (updates as any).tokenVersion = (employee.tokenVersion ?? 0) + 1;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No valid update fields provided' });
      return;
    }

    await db.update(users)
      .set(updates)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)));

    const updatedEmployee = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    const { passwordHash, ...safeUser } = updatedEmployee!;
    res.json(safeUser);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Generate Invite Token (Admin Only) ──────────────────────────────
router.post('/generate-invite', authorize('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;

    const inviteToken = jwt.sign(
      { tenantId, role: 'salesman', action: 'invite' },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ inviteToken });
  } catch (error) {
    console.error('Error generating invite token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
