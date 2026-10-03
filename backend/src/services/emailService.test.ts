import test from 'node:test';
import assert from 'node:assert/strict';

import { getEmailRuntimeStatus, normalizeEmailInput } from './emailService.ts';

test('normalizes recipient input and validates required fields', () => {
  const result = normalizeEmailInput({
    to: [' user@example.com ', 'sales@example.com'],
    subject: '  Hello there  ',
    text: 'Body text',
    html: '<p>Body</p>'
  });

  assert.deepEqual(result.recipients, ['user@example.com', 'sales@example.com']);
  assert.equal(result.subject, 'Hello there');
  assert.equal(result.text, 'Body text');
});

test('returns demo mode when no real email key is configured', () => {
  const status = getEmailRuntimeStatus({
    UPTIQ_API_KEY: 'test-uptiq-key',
    EMAIL_PROVIDER: 'resend',
    EMAIL_FROM: 'noreply@greencrm.local'
  });

  assert.equal(status.mode, 'demo');
  assert.equal(status.provider, 'resend');
  assert.match(status.message, /demo/i);
});

test('returns live mode when a real key is configured', () => {
  const status = getEmailRuntimeStatus({
    UPTIQ_API_KEY: 'real-key-123',
    EMAIL_PROVIDER: 'resend',
    EMAIL_FROM: 'noreply@greencrm.local'
  });

  assert.equal(status.mode, 'live');
  assert.equal(status.provider, 'resend');
  assert.match(status.message, /live/i);
});

test('returns outlook mode when Microsoft Graph credentials are configured', () => {
  const status = getEmailRuntimeStatus({
    EMAIL_PROVIDER: 'outlook',
    OUTLOOK_TENANT_ID: 'tenant-id',
    OUTLOOK_CLIENT_ID: 'client-id',
    OUTLOOK_CLIENT_SECRET: 'client-secret',
    OUTLOOK_USER_EMAIL: 'outlook-user@company.com'
  });

  assert.equal(status.mode, 'live');
  assert.equal(status.provider, 'outlook');
  assert.match(status.message, /outlook|live/i);
});

test('rejects invalid recipient values before composing a Gmail header', () => {
  assert.throws(() => normalizeEmailInput({
    to: ['Jane Doe', 'not-an-email'],
    subject: 'Hello',
    text: 'Body text'
  }), /recipient|email/i);
});
