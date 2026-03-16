/// <reference path="./shared/types/express.ts" />

import { createApp } from './app/create-app.ts';
import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import { initializeApiRuntime, registerServerShutdownHooks } from './server/runtime.ts';

const serverLogger = logger.child('server');

const runtime = await initializeApiRuntime();
const app = await createApp();

const server = app.listen(env.port, '0.0.0.0', () => {
  serverLogger.info('API server listening.', {
    port: env.port,
    environment: env.nodeEnv,
    workerMode: false,
  });
});

registerServerShutdownHooks(server, runtime);
