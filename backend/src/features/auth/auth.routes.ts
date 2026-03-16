import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.ts';
import { logger } from '../../config/logger.ts';
import { asyncHandler } from '../../shared/http/async-handler.ts';
import { buildAnalysisDetail } from '../audits/analysis-details.ts';
import { listAnalysisReportFiles, sendAnalysisReportFile } from '../audits/analysis-reports.ts';
import { getAnalysisRecordModel, getEmailModule, getUserModel } from './auth.dependencies.ts';
import { authRequired, decodeAuthToken, readBearerToken } from './auth.middleware.ts';

const authLogger = logger.child('feature:auth');
const router = Router();

function signToken(user: { _id: { toString(): string } | string; email: string; role?: string }): string {
  return jwt.sign(
    {
      id: typeof user._id === 'string' ? user._id : user._id.toString(),
      email: user.email,
      role: user.role || 'user',
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

function randomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function buildOwnedAnalysisQuery(user: { id?: string; email?: string } | undefined): Record<string, unknown> {
  return {
    $or: [
      { user: user?.id },
      { email: user?.email },
    ],
  };
}

router.post('/register', asyncHandler(async (request, response) => {
  const User = await getUserModel();
  const emailModule = await getEmailModule();

  let { email, password } = request.body ?? {};
  if (!email || !password) {
    response.status(400).json({ error: 'Email and password required' });
    return;
  }

  email = String(email).trim().toLowerCase();
  password = String(password);

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    response.status(409).json({ error: 'User already exists' });
    return;
  }

  if (password.length < 6) {
    response.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const verificationToken = randomToken();
  const user = await User.create({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'user',
    provider: 'local',
    verified: false,
    verificationTokenHash: hashToken(verificationToken),
    verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  try {
    await emailModule.sendVerificationEmail(email, verificationToken);
  } catch (error) {
    authLogger.warn('Verification email failed during registration.', {
      email,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  response.status(201).json({
    message: 'Registered. Please verify your email.',
    user: {
      email: user.email,
      role: user.role,
      verified: false,
    },
  });
}));

router.post('/verify-email', asyncHandler(async (request, response) => {
  const User = await getUserModel();
  const { token } = request.body ?? {};

  if (!token) {
    response.status(400).json({ error: 'Token required' });
    return;
  }

  const user = await User.findOne({
    verificationTokenHash: hashToken(String(token)),
    verificationExpires: { $gt: new Date() },
  });

  if (!user) {
    response.status(400).json({ error: 'Invalid or expired token' });
    return;
  }

  user.verified = true;
  user.verificationTokenHash = undefined;
  user.verificationExpires = undefined;
  await user.save();

  response.json({
    token: signToken(user),
    user: {
      email: user.email,
      role: user.role,
      verified: true,
    },
  });
}));

router.post('/resend-verification', asyncHandler(async (request, response) => {
  const User = await getUserModel();
  const emailModule = await getEmailModule();
  const { email } = request.body ?? {};

  if (!email) {
    response.status(400).json({ error: 'Email required' });
    return;
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user) {
    response.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.verified) {
    response.status(400).json({ error: 'Already verified' });
    return;
  }

  const verificationToken = randomToken();
  user.verificationTokenHash = hashToken(verificationToken);
  user.verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  try {
    await emailModule.sendVerificationEmail(user.email, verificationToken);
  } catch (error) {
    authLogger.warn('Verification email failed during resend.', {
      email: user.email,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  response.json({ message: 'Verification email sent' });
}));

router.post('/login', asyncHandler(async (request, response) => {
  const User = await getUserModel();
  const { email, password } = request.body ?? {};

  if (!email || !password) {
    response.status(400).json({ error: 'Email and password required' });
    return;
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() });
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash || ''))) {
    response.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (!user.verified) {
    response.status(403).json({ error: 'Email not verified' });
    return;
  }

  response.json({
    token: signToken(user),
    user: {
      email: user.email,
      role: user.role,
      verified: true,
    },
  });
}));

router.post('/forgot-password', asyncHandler(async (request, response) => {
  const User = await getUserModel();
  const emailModule = await getEmailModule();
  const { email } = request.body ?? {};

  if (!email) {
    response.status(400).json({ error: 'Email required' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (user) {
    const resetToken = randomToken();
    user.resetTokenHash = hashToken(resetToken);
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    try {
      await emailModule.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      authLogger.warn('Password reset email failed.', {
        email: user.email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  response.json({ message: 'If that email exists, a reset link has been sent.' });
}));

router.post('/reset-password', asyncHandler(async (request, response) => {
  const User = await getUserModel();
  const { token, password } = request.body ?? {};

  if (!token || !password) {
    response.status(400).json({ error: 'Token and new password required' });
    return;
  }

  if (String(password).length < 6) {
    response.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const user = await User.findOne({
    resetTokenHash: hashToken(String(token)),
    resetExpires: { $gt: new Date() },
  });

  if (!user) {
    response.status(400).json({ error: 'Invalid or expired token' });
    return;
  }

  user.passwordHash = await bcrypt.hash(String(password), 10);
  user.resetTokenHash = undefined;
  user.resetExpires = undefined;
  await user.save();

  response.json({
    message: 'Password has been reset.',
    token: signToken(user),
    user: {
      email: user.email,
      role: user.role,
      verified: user.verified,
    },
  });
}));

router.get('/me', asyncHandler(async (request, response) => {
  const User = await getUserModel();
  const token = readBearerToken(request);

  if (!token) {
    response.status(200).json({ user: null });
    return;
  }

  try {
    const payload = decodeAuthToken(token);
    const user = await User.findById(payload.id).lean();

    if (!user) {
      response.status(200).json({ user: null });
      return;
    }

    response.json({
      user: {
        email: user.email,
        role: user.role,
        verified: user.verified,
      },
    });
  } catch {
    response.status(200).json({ user: null });
  }
}));

router.get('/my-analysis', authRequired, asyncHandler(async (request, response) => {
  const AnalysisRecord = await getAnalysisRecordModel();
  const user = request.user;
  const limit = Number(request.query.limit) || 50;

  const items = await AnalysisRecord.find(buildOwnedAnalysisQuery(user))
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  response.json({ items });
}));

router.get('/my-analysis/:taskId', authRequired, asyncHandler(async (request, response) => {
  const AnalysisRecord = await getAnalysisRecordModel();
  const user = request.user;
  const taskId = String(request.params.taskId || '').trim();

  if (!taskId) {
    response.status(400).json({ error: 'Task ID is required.' });
    return;
  }

  const item = await AnalysisRecord.findOne({
    $and: [
      { taskId },
      buildOwnedAnalysisQuery(user),
    ],
  });

  if (!item) {
    response.status(404).json({ error: 'Analysis record not found.' });
    return;
  }

  await listAnalysisReportFiles(item);
  response.json({ item: buildAnalysisDetail(item) });
}));

router.get('/my-analysis/:taskId/reports', authRequired, asyncHandler(async (request, response) => {
  const AnalysisRecord = await getAnalysisRecordModel();
  const user = request.user;
  const taskId = String(request.params.taskId || '').trim();

  if (!taskId) {
    response.status(400).json({ error: 'Task ID is required.' });
    return;
  }

  const item = await AnalysisRecord.findOne({
    $and: [
      { taskId },
      buildOwnedAnalysisQuery(user),
    ],
  });

  if (!item) {
    response.status(404).json({ error: 'Analysis record not found.' });
    return;
  }

  const files = await listAnalysisReportFiles(item);
  response.json({ files });
}));

router.get('/my-analysis/:taskId/reports/:reportId', authRequired, asyncHandler(async (request, response) => {
  const AnalysisRecord = await getAnalysisRecordModel();
  const user = request.user;
  const taskId = String(request.params.taskId || '').trim();
  const reportId = String(request.params.reportId || '').trim();
  const disposition = request.query.disposition === 'inline' ? 'inline' : 'attachment';

  if (!taskId || !reportId) {
    response.status(400).json({ error: 'Task ID and report ID are required.' });
    return;
  }

  const item = await AnalysisRecord.findOne({
    $and: [
      { taskId },
      buildOwnedAnalysisQuery(user),
    ],
  });

  if (!item) {
    response.status(404).json({ error: 'Analysis record not found.' });
    return;
  }

  const sent = await sendAnalysisReportFile(item, reportId, response, disposition).catch((error) => {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return false;
    }

    throw error;
  });

  if (!sent && !response.headersSent) {
    response.status(404).json({ error: 'Report file not found.' });
  }
}));

export default router;
