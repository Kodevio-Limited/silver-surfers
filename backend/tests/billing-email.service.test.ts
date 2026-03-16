import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOneTimePurchaseEmailContent,
  buildSubscriptionCancellationEmailContent,
  buildTeamInvitationEmailContent,
} from '../src/features/billing/billing-email.service.ts';

test('buildTeamInvitationEmailContent includes the invitation accept link and plan details', () => {
  const content = buildTeamInvitationEmailContent(
    'owner@example.com',
    'Owner Name',
    'Pro',
    'invite-token-123',
    'https://app.silversurfers.ai/',
  );

  assert.match(content.html, /Owner Name/);
  assert.match(content.html, /Pro/);
  assert.match(content.html, /https:\/\/app\.silversurfers\.ai\/team\/accept\?token=invite-token-123/);
  assert.match(content.text, /Accept Invitation: https:\/\/app\.silversurfers\.ai\/team\/accept\?token=invite-token-123/);
});

test('buildSubscriptionCancellationEmailContent describes scheduled cancellation date', () => {
  const content = buildSubscriptionCancellationEmailContent(
    'Starter',
    true,
    new Date('2026-04-20T00:00:00.000Z'),
  );

  assert.match(content.html, /Starter subscription has been cancelled/);
  assert.match(content.html, /April 20, 2026/);
  assert.match(content.text, /April 20, 2026/);
});

test('buildOneTimePurchaseEmailContent confirms scan credit availability', () => {
  const content = buildOneTimePurchaseEmailContent('One-Time Report');

  assert.match(content.html, /one-time purchase is ready/i);
  assert.match(content.text, /one-time scan credit has been added to your account/i);
});
