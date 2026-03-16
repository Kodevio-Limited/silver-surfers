import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.ts';

const requestLogger = logger.child('http:request');

export function requestLogging(request: Request, response: Response, next: NextFunction): void {
  const startedAt = Date.now();

  response.on('finish', () => {
    const requestPath = request.path || request.originalUrl.split('?')[0];
    const isHealthCheck = ['GET', 'HEAD'].includes(request.method) && requestPath === '/health';
    const logMethod = isHealthCheck ? requestLogger.debug.bind(requestLogger) : requestLogger.info.bind(requestLogger);

    logMethod('Request completed.', {
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
}
