import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeLocalCsvContext } from './aiService.ts';

test('accepts bounded scalar CSV row context', () => {
  assert.deepEqual(normalizeLocalCsvContext([{ company: 'Acme', count: 12, active: true, note: null }]), [
    { company: 'Acme', count: 12, active: true, note: null }
  ]);
});

test('rejects CSV context beyond safe row, column, cell, and byte bounds', () => {
  assert.throws(() => normalizeLocalCsvContext(Array.from({ length: 101 }, () => ({}))), /limited to 100 rows/);
  assert.throws(() => normalizeLocalCsvContext([Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`column${i}`, 'value']))]), /limited to 30 columns/);
  assert.throws(() => normalizeLocalCsvContext([{ note: 'x'.repeat(301) }]), /limited to 300 characters/);
  const largeRows = Array.from({ length: 3 }, () =>
    Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`column${i}`, 'x'.repeat(300)]))
  );
  assert.throws(() => normalizeLocalCsvContext(largeRows), /context is too large/);
});

test('rejects non-scalar cell values and malformed rows', () => {
  assert.throws(() => normalizeLocalCsvContext('not rows'), /must be an array/);
  assert.throws(() => normalizeLocalCsvContext([['not', 'an object']]), /must be an object/);
  assert.throws(() => normalizeLocalCsvContext([{ nested: { value: 'no' } }]), /unsupported cell value/);
});
