/**
 * Records Routes
 */

import express from 'express';
import { authRequired } from '../auth.js';
import { adminOnly } from '../middleware/adminOnly.js';
import { cleanupFolder } from '../../../../src/features/records/cleanup.service.ts';

const router = express.Router();

// Cleanup route
router.post('/cleanup', authRequired, adminOnly, async (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) {
    return res.status(400).json({ error: 'folderPath is required.' });
  }
  try {
    const result = await cleanupFolder(folderPath);
    res.status(200).json({ message: 'Cleanup successful.', folderPath: result.cleanedPath });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    res.status(statusCode).json({ error: error?.message || 'Failed to perform cleanup.' });
  }
});

export default router;
