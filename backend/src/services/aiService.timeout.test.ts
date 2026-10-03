import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMockResearchResult, withTimeout } from './aiService.ts';

test('times out slow external AI calls instead of hanging forever', async () => {
  const slowPromise = new Promise<string>((resolve) => {
    setTimeout(() => resolve('done'), 200);
  });

  await assert.rejects(() => withTimeout(slowPromise, 25), /timed out|timeout/i);
});

test('builds a usable mock research result when the live AI provider is unavailable', () => {
  const result = buildMockResearchResult('Acme');

  assert.equal(result.account.name, 'Acme');
  assert.equal(result.metadata.generated_by, 'demo_fallback');
  assert.ok(Array.isArray(result.leads));
  assert.ok(result.sales_insights.value_proposition.length > 0);
});
