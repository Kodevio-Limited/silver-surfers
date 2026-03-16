import type { NextFunction, Request, Response } from 'express';

import crypto from 'node:crypto';

export function requestContext(request: Request, _response: Response, next: NextFunction): void {
  request.requestId = request.header('x-request-id') || crypto.randomUUID();
  next();
}
