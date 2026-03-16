import type { Request, Response } from 'express';

export function notFoundHandler(request: Request, response: Response): void {
  response.status(404).json({
    error: 'Route not found',
    path: request.originalUrl,
    requestId: request.requestId,
  });
}
