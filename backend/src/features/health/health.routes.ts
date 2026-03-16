import { Router } from 'express';

import { env } from '../../config/env.ts';

const router = Router();

router.get('/health', (_request, response) => {
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

export default router;
