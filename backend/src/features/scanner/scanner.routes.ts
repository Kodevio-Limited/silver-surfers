import { Router } from 'express';

import { asyncHandler } from '../../shared/http/async-handler.ts';
import { AppError } from '../../shared/errors/app-error.ts';
import { getScannerLoad, runPrecheck, runScannerAudit } from './scanner.service.ts';

const router = Router();

router.get('/health', (_request, response) => {
  response.json({
    status: 'healthy',
    service: 'node-scanner',
    ...getScannerLoad(),
  });
});

router.head('/health', (_request, response) => {
  response.status(200).end();
});

router.post('/precheck', asyncHandler(async (request, response) => {
  const { url } = request.body ?? {};
  if (!url) {
    throw new AppError('URL is required', 400);
  }

  const result = await runPrecheck(url);
  response.json(result);
}));

router.post('/audit', asyncHandler(async (request, response) => {
  const { url, device, format, isLiteVersion, includeReport } = request.body ?? {};

  if (!url) {
    throw new AppError('URL is required', 400);
  }

  const result = await runScannerAudit({
    url,
    device,
    format,
    isLiteVersion,
    includeReport,
  });

  response.json(result);
}));

export default router;
