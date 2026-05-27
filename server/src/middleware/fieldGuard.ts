import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@sales-app/shared';

export interface FieldGuardRules {
  strip?: string[];
  reject?: string[];
}

export const fieldGuard = (rules: Partial<Record<UserRole, FieldGuardRules>>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next();
      return;
    }

    const roleRules = rules[req.user.role];
    if (!roleRules) {
      next();
      return;
    }

    if (req.body) {
      // 1. Check for fields to reject
      if (roleRules.reject) {
        for (const field of roleRules.reject) {
          if (field in req.body && req.body[field] !== undefined) {
            res.status(400).json({
              error: `Bad Request: Modifying field '${field}' is forbidden for role '${req.user.role}'`,
            });
            return;
          }
        }
      }

      // 2. Check for fields to strip
      if (roleRules.strip) {
        for (const field of roleRules.strip) {
          if (field in req.body) {
            delete req.body[field];
          }
        }
      }
    }

    next();
  };
};
