import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPasswordResetEmailContent,
  buildPasswordResetLink,
  buildVerificationEmailContent,
  buildVerificationLink,
} from '../src/features/auth/auth-email.service.ts';

test('buildVerificationLink trims trailing slashes and encodes tokens', () => {
  const link = buildVerificationLink('token with spaces', 'https://app.example.com///');
  assert.equal(link, 'https://app.example.com/verify-email?token=token%20with%20spaces');
});

test('buildVerificationEmailContent includes verify link in html and text', () => {
  const content = buildVerificationEmailContent('verify-token', 'https://app.example.com');

  assert.match(content.html, /Welcome to SilverSurfers/);
  assert.match(content.html, /https:\/\/app\.example\.com\/verify-email\?token=verify-token/);
  assert.match(content.text, /Verify Email: https:\/\/app\.example\.com\/verify-email\?token=verify-token/);
  assert.match(content.text, /Token: verify-token/);
});

test('buildPasswordResetLink trims trailing slashes and encodes tokens', () => {
  const link = buildPasswordResetLink('reset/token', 'https://app.example.com/');
  assert.equal(link, 'https://app.example.com/reset-password?token=reset%2Ftoken');
});

test('buildPasswordResetEmailContent includes reset link in html and text', () => {
  const content = buildPasswordResetEmailContent('reset-token', 'https://app.example.com');

  assert.match(content.html, /Password Reset/);
  assert.match(content.html, /https:\/\/app\.example\.com\/reset-password\?token=reset-token/);
  assert.match(content.text, /Reset Password: https:\/\/app\.example\.com\/reset-password\?token=reset-token/);
  assert.match(content.text, /Token: reset-token/);
});
