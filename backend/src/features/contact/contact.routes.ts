import { Router } from 'express';

import { logger } from '../../config/logger.ts';
import ContactMessage from '../../models/contact-message.model.ts';
import { asyncHandler } from '../../shared/http/async-handler.ts';
import { sendContactNotification } from './contact-notifications.ts';

const contactLogger = logger.child('feature:contact');
const router = Router();

router.post('/contact', asyncHandler(async (request, response) => {
  const { name, email, subject, message } = request.body ?? {};

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    response.status(400).json({ error: 'Message is required (min 5 chars).' });
    return;
  }

  const item = await ContactMessage.create({
    name: typeof name === 'string' ? name.trim() : '',
    email: typeof email === 'string' ? email.trim() : '',
    subject: typeof subject === 'string' ? subject.trim() : '',
    message: message.trim(),
  });

  try {
    await sendContactNotification({
      id: String((item as { _id?: unknown })._id || ''),
      name: typeof item.name === 'string' ? item.name : '',
      email: typeof item.email === 'string' ? item.email : '',
      subject: typeof item.subject === 'string' ? item.subject : '',
      message: typeof item.message === 'string' ? item.message : message.trim(),
      submittedAtIso: new Date().toISOString(),
    });
  } catch (error) {
    contactLogger.error('Contact notification email crashed.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  response.status(201).json({ success: true, item });
}));

export default router;
