import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.ts';

/**
 * Simple role‑based access control middleware.
 * Expected `req.user` to contain `{ id: string; role: string }` populated by authentication.
 * Roles hierarchy (high → low): admin > compliance_manager > developer > read_only
 */
const roleHierarchy = ['read_only', 'developer', 'compliance_manager', 'admin'] as const;

type Role = typeof roleHierarchy[number];

export function requireRole(minRole: Role) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user as { id: string; role: Role } | undefined;
    if (!user) {
      logger.warn('RBAC: missing user on request');
      return _res.status(401).json({ error: 'Authentication required' });
    }
    const userIdx = roleHierarchy.indexOf(user.role);
    const minIdx = roleHierarchy.indexOf(minRole);
    if (userIdx < 0 || userIdx < minIdx) {
      logger.warn('RBAC: insufficient role', { userId: user.id, required: minRole, actual: user.role });
      return _res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

export function attachUser(req: Request, _res: Response, next: NextFunction) {
  // Placeholder – in a real system this would verify a JWT or API key.
  // For now we just stub an admin user for local dev.
  (req as any).user = { id: 'system', role: 'admin' };
  next();
}
