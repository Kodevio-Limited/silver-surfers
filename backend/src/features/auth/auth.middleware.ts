import type { NextFunction, Request, Response } from 'express';

import jwt from 'jsonwebtoken';

import { env } from '../../config/env.ts';

interface AuthTokenPayload {
  id: string;
  email: string;
  role?: string;
}

export function readBearerToken(request: Request): string | undefined {
  const authorization = request.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorization.slice('Bearer '.length).trim();
}

export function decodeAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}

export function authRequired(request: Request, response: Response, next: NextFunction): void {
  try {
    const token = readBearerToken(request);
    if (!token) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    request.user = decodeAuthToken(token);
    next();
  } catch {
    response.status(401).json({ error: 'Invalid token' });
  }
}
