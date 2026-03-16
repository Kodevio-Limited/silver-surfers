/// <reference path="./shared/types/express.ts" />

import express from 'express';

import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import scannerRouter from './features/scanner/scanner.routes.ts';
import { errorHandler } from './shared/http/error-handler.ts';
import { requestContext } from './shared/http/request-context.ts';
import { requestLogging } from './shared/http/request-logging.ts';

const scannerLogger = logger.child('scanner-server');
const app = express();

app.disable('x-powered-by');
app.use(requestContext);
app.use(requestLogging);
app.use(express.json({ limit: '2mb' }));
app.use(scannerRouter);
app.use(errorHandler);

app.listen(env.scannerPort, '0.0.0.0', () => {
  scannerLogger.info('Scanner service listening.', {
    port: env.scannerPort,
    environment: env.nodeEnv,
    backendRoot: env.backendRoot,
  });
});
