import { Router } from 'express';
import ScheduledScan from '../../models/scheduled-scan.model.ts';
import { logger } from '../../config/logger.ts';

const router = Router();

// List all scheduled scans for the authenticated user (stubbed admin)
router.get('/', async (req, res) => {
  try {
    const scans = await ScheduledScan.find().lean();
    res.json(scans);
  } catch (err) {
    logger.error('Failed to fetch scheduled scans', { error: err });
    res.status(500).json({ error: 'Unable to fetch schedules' });
  }
});

// Create a new scheduled scan
router.post('/', async (req, res) => {
  const { user, url, cronExpression } = req.body;
  if (!user || !url || !cronExpression) {
    return res.status(400).json({ error: 'user, url and cronExpression required' });
  }
  try {
    const scan = await ScheduledScan.create({ user, url, cronExpression });
    res.status(201).json(scan);
  } catch (err) {
    logger.error('Failed to create scheduled scan', { error: err });
    res.status(500).json({ error: 'Unable to create schedule' });
  }
});

// Delete a schedule by id
router.delete('/:id', async (req, res) => {
  try {
    await ScheduledScan.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    logger.error('Failed to delete scheduled scan', { error: err });
    res.status(500).json({ error: 'Unable to delete schedule' });
  }
});

export default router;
