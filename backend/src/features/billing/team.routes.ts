import { Router } from 'express';

import { asyncHandler } from '../../shared/http/async-handler.ts';
import { authRequired } from '../auth/auth.middleware.ts';
import {
  acceptInvite,
  addTeamMember,
  getInvite,
  getTeam,
  getTeamScans,
  leaveTeam,
  removeTeamMember,
} from './team.controller.ts';

const router = Router();

router.post('/subscription/team/add', authRequired, asyncHandler(addTeamMember));
router.post('/subscription/team/leave', authRequired, asyncHandler(leaveTeam));
router.post('/subscription/team/remove', authRequired, asyncHandler(removeTeamMember));
router.get('/subscription/team', authRequired, asyncHandler(getTeam));
router.get('/subscription/team/scans', authRequired, asyncHandler(getTeamScans));
router.get('/subscription/team/invite/:token', asyncHandler(getInvite));
router.post('/subscription/team/accept', authRequired, asyncHandler(acceptInvite));

export default router;
