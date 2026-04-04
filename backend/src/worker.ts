/// <reference path="./shared/types/express.ts" />

import { env } from './config/env.ts';
import { logger } from './config/logger.ts';
import { initializeWorkerRuntime, registerWorkerShutdownHooks } from './server/runtime.ts';
import dns from 'dns';

// Ensure DNS resolution is working before starting the worker
dns.setServers(['1.1.1.1', '8.8.8.8']);
const workerLogger = logger.child('worker');

const runtime = await initializeWorkerRuntime();

workerLogger.info('Background worker online.', {
  environment: env.nodeEnv,
  backendRoot: env.backendRoot,
  queueBackend: env.queueBackend,
  bullMqPrefix: env.bullMqPrefix,
  scannerServiceUrl: env.scannerServiceUrl,
});

registerWorkerShutdownHooks(runtime);
