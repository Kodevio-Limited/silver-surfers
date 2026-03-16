import cors from 'cors';

import { env } from '../../config/env.ts';
import { logger } from '../../config/logger.ts';

const corsLogger = logger.child('cors');

const allowedOrigins = [env.frontendUrl, ...env.additionalAllowedOrigins];

function getOriginVariants(origin: string): string[] {
  try {
    const url = new URL(origin);
    const host = url.hostname;
    const base = `${url.protocol}//${host}${url.port ? `:${url.port}` : ''}`;

    if (host.startsWith('www.')) {
      return [origin, base, `${url.protocol}//${host.slice(4)}${url.port ? `:${url.port}` : ''}`];
    }

    return [origin, base, `${url.protocol}//www.${host}${url.port ? `:${url.port}` : ''}`];
  } catch {
    return [origin];
  }
}

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  const variants = getOriginVariants(origin);
  return allowedOrigins.some((allowedOrigin) => {
    const allowedVariants = getOriginVariants(allowedOrigin);
    return variants.some((variant) => allowedVariants.includes(variant));
  });
}

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    corsLogger.warn('Blocked CORS origin.', {
      origin,
      allowedOrigins,
    });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Request-Id'],
  maxAge: 600,
});
