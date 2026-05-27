import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { and, eq } from 'drizzle-orm';
import { AuthPayload } from '@sales-app/shared';
import { config } from '../config.js';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthPayload;

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, decoded.sub), eq(users.tenantId, decoded.tenantId)),
      columns: { status: true, tokenVersion: true },
    });

    if (!user || user.status === 'inactive') {
      res.status(401).json({ error: 'Unauthorized: User account is inactive or no longer exists' });
      return;
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      res.status(401).json({ error: 'Unauthorized: Token has been revoked' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
      return;
    }
    next(error);
  }
};
