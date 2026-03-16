import type { NextFunction, Request, Response } from 'express';

export function securityHeaders(_request: Request, response: Response, next: NextFunction): void {
  response.setHeader('X-Frame-Options', 'SAMEORIGIN');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}
