import test from 'node:test';
import assert from 'node:assert/strict';

import { buildContactNotification } from '../src/features/contact/contact-notifications.ts';

test('buildContactNotification formats subject and text for contact submissions', () => {
  const notification = buildContactNotification({
    id: 'msg_123',
    name: 'Taylor',
    email: 'taylor@example.com',
    subject: 'Enterprise inquiry',
    message: 'Please contact us about onboarding.',
    submittedAtIso: '2026-03-16T10:00:00.000Z',
  });

  assert.equal(notification.subject, 'New Contact Form Message: Enterprise inquiry');
  assert.match(notification.text, /Name: Taylor/);
  assert.match(notification.text, /Email: taylor@example.com/);
  assert.match(notification.text, /Please contact us about onboarding\./);
  assert.match(notification.text, /Message ID: msg_123/);
});
