/// <reference path="./shared/types/express.ts" />

import { createApp } from './app/create-app.ts';
import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import { initializeApiRuntime, registerServerShutdownHooks } from './server/runtime.ts';

const serverLogger = logger.child('server');

const runtime = await initializeApiRuntime();
const app = await createApp();
app.get('/healthz', (_request, response) => {
  response.json({
    status: 'healthy',
    service: 'silver-surfers-api',
    environment: env.nodeEnv,
    backendRoot: env.backendRoot,
    workerMode: false,
    queueBackend: env.queueBackend,
    bullMqPrefix: env.bullMqPrefix,
    scannerServiceUrl: env.scannerServiceUrl,
    note: 'This API process only enqueues audit jobs. Run the worker and scanner services separately.',
  });
});

const server = app.listen(env.port, '0.0.0.0', () => {
  serverLogger.info('API server listening.', {
    port: env.port,
    environment: env.nodeEnv,
    workerMode: false,
  });
});

registerServerShutdownHooks(server, runtime);
