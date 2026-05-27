import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { tenants, users } from '../db/schema.js';
import { registerBusinessSchema, loginSchema, AuthPayload } from '@sales-app/shared';
import { rateLimiter, validate } from '../middleware/index.js';
import { config } from '../config.js';

const router = Router();

const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many authentication attempts from this IP, please try again later.',
});

router.use(authLimiter);

// Generate access and refresh tokens
const generateTokens = (payload: AuthPayload) => {
  const accessToken = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// ─── Register Business (Creates Tenant + Admin User) ────────────────
router.post('/register', validate(registerBusinessSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessName, username, email, phone, password } = req.body;

    // Check if username already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (existingUser) {
      res.status(400).json({ error: 'Username is already taken' });
      return;
    }

    const tenantId = uuidv4();
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    // Atomically create tenant and admin user
    await db.transaction(async (tx) => {
      await tx.insert(tenants).values({
        id: tenantId,
        name: businessName,
        tier: 'free',
      });

      await tx.insert(users).values({
        id: userId,
        tenantId,
        username,
        email: email || null,
        phone: phone || null,
        passwordHash,
        role: 'admin',
        status: 'active',
      });
    });

    const userPayload: AuthPayload = {
      sub: userId,
      tenantId,
      role: 'admin',
      tokenVersion: 0,
    };

    const tokens = generateTokens(userPayload);

    res.status(201).json({
      ...tokens,
      user: {
        id: userId,
        tenantId,
        tenantName: businessName,
        username,
        email: email || null,
        phone: phone || null,
        role: 'admin',
        status: 'active',
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// ─── Login ──────────────────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });

    if (!user || user.status === 'inactive') {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const userPayload: AuthPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const tokens = generateTokens(userPayload);

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, user.tenantId),
    });

    res.json({
      ...tokens,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        tenantName: tenant?.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// ─── Refresh Token ──────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as AuthPayload;

    // Check if the user is still active in the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.sub),
    });

    if (!user || user.status === 'inactive') {
      res.status(401).json({ error: 'User is inactive or no longer exists' });
      return;
    }

    const userPayload: AuthPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const tokens = generateTokens(userPayload);

    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ─── Verify Invite Token (Public) ──────────────────────────────────
router.post('/verify-invite', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { tenantId: string; role: string; action: string };
    if (decoded.action !== 'invite' || decoded.role !== 'salesman') {
      res.status(400).json({ error: 'Invalid invitation token' });
      return;
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, decoded.tenantId),
    });

    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    res.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      role: decoded.role,
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired invitation token' });
  }
});

// ─── Register Salesman via Invite (Public) ──────────────────────────
router.post('/register-salesman', async (req: Request, res: Response): Promise<void> => {
  const { token, username, password, email, phone } = req.body;
  if (!token || !username || !password) {
    res.status(400).json({ error: 'Token, username, and password are required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { tenantId: string; role: string; action: string };
    if (decoded.action !== 'invite' || decoded.role !== 'salesman') {
      res.status(400).json({ error: 'Invalid invitation token' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long' });
      return;
    }

    // Check if username already exists globally
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
      tenantId: decoded.tenantId,
      username,
      email: email || null,
      phone: phone || null,
      passwordHash,
      role: 'salesman',
      status: 'active',
    });

    const userPayload: AuthPayload = {
      sub: userId,
      tenantId: decoded.tenantId,
      role: 'salesman',
      tokenVersion: 0,
    };

    const tokens = generateTokens(userPayload);

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, decoded.tenantId),
    });

    res.status(201).json({
      ...tokens,
      user: {
        id: userId,
        tenantId: decoded.tenantId,
        tenantName: tenant?.name,
        username,
        email: email || null,
        phone: phone || null,
        role: 'salesman',
        status: 'active',
      },
    });
  } catch (error) {
    console.error('Invite-based registration error:', error);
    res.status(400).json({ error: 'Invalid or expired invitation token' });
  }
});

export default router;
