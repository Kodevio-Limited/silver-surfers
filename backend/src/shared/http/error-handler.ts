import type { NextFunction, Request, Response } from 'express';

import { env } from '../../config/env.ts';
import { logger } from '../../config/logger.ts';
import { AppError } from '../errors/app-error.ts';

const errorLogger = logger.child('http:error');

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction): void {
  const appError = error instanceof AppError
    ? error
    : new AppError('Internal server error', 500, { expose: false, details: error });

  errorLogger.error('Request failed.', {
    method: request.method,
    path: request.originalUrl,
    requestId: request.requestId,
    statusCode: appError.statusCode,
    error: error instanceof Error ? error.message : String(error),
  });

  response.status(appError.statusCode).json({
    error: appError.expose ? appError.message : 'Internal server error',
    requestId: request.requestId,
    ...(env.isDevelopment && appError.details ? { details: appError.details } : {}),
  });
}
