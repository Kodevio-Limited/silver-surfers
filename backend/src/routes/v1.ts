import { Router } from 'express';
import { attachUser } from '../../middleware/rbac.ts';
import { startScheduler } from '../scheduler/scheduler.service.ts';
import scheduledScanRouter from '../scheduler/scheduler.routes.ts';
import healthcareRouter from '../healthcare/healthcare.routes.ts';
import certificationRouter from '../certification/certification.routes.ts';
import regressionRouter from '../regression/regression.routes.ts';

// Health check is a simple endpoint, not under /v1
export const healthRouter = Router();
healthRouter.get('/healthz', (req, res) => {
  // In a real app you would check DB, queue, etc.
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Versioned API router
export const v1Router = Router();

// Attach a stub user for local dev (replace with real auth later)
v1Router.use(attachUser);

// Register feature routers
v1Router.use('/schedules', scheduledScanRouter);
v1Router.use('/healthcare', healthcareRouter);
v1Router.use('/certifications', certificationRouter);
v1Router.use('/regressions', regressionRouter);

// Initialise scheduler when the API server starts
startScheduler().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start scheduler', err);
});

export default v1Router;
