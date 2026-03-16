import express from 'express';

import { env } from '../config/env.ts';
import { corsMiddleware } from '../infrastructure/http/cors.ts';
import { securityHeaders } from '../infrastructure/http/security-headers.ts';
import { registerFeatures } from '../features/register-features.ts';
import { errorHandler } from '../shared/http/error-handler.ts';
import { notFoundHandler } from '../shared/http/not-found.ts';
import { requestContext } from '../shared/http/request-context.ts';
import { requestLogging } from '../shared/http/request-logging.ts';

export async function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestContext);

  if (env.requestLogEnabled) {
    app.use(requestLogging);
  }

  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use('/stripe-webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '2mb' }));

  await registerFeatures(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
