import type { NextFunction, Request, Response } from 'express';

export function adminRequired(request: Request, response: Response, next: NextFunction): void {
  if (request.user?.role !== 'admin') {
    response.status(403).json({ error: 'Admin access required.' });
    return;
  }

  next();
}
