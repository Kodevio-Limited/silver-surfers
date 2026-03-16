import { Router } from 'express';

import { asyncHandler } from '../../shared/http/async-handler.ts';
import { adminRequired } from '../auth/admin.middleware.ts';
import { authRequired } from '../auth/auth.middleware.ts';
import { cleanupFolder } from './cleanup.service.ts';

const router = Router();

router.post('/cleanup', authRequired, adminRequired, asyncHandler(async (request, response) => {
  const { folderPath } = request.body ?? {};

  if (!folderPath || typeof folderPath !== 'string') {
    response.status(400).json({ error: 'folderPath is required.' });
    return;
  }

  const result = await cleanupFolder(folderPath);
  response.status(200).json({
    message: 'Cleanup successful.',
    folderPath: result.cleanedPath,
  });
}));

export default router;
