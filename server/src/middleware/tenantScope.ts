import { Request, Response, NextFunction } from 'express';

export const tenantScope = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || !req.user.tenantId) {
    res.status(400).json({ error: 'Bad Request: Tenant scope missing' });
    return;
  }
  next();
};
