import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseState, serializeState, resolveScreen, customSpec, guessCurrent } from '../js/state.js';

const defaults = { from: 'mbp16', to: 'mbp14' };

test('round trip', () => {
  const s = { from: 'mba13', to: 'c-15.0-16x9', cal: 4.321, fill: true };
  assert.deepEqual(parseState(serializeState(s), defaults), s);
});

test('invalid params fall back to defaults', () => {
  const s = parseState('?from=nope&to=c-99-16x10&cal=-3&fill=x', defaults);
  assert.deepEqual(s, { from: 'mbp16', to: 'mbp14', cal: null, fill: false });
});

test('custom screen', () => {
  assert.equal(customSpec(16, '16x10'), 'c-16.0-16x10');
  const c = resolveScreen('c-16.0-16x10');
  assert.equal(c.diagonalIn, 16);
  assert.ok(c.custom);
  assert.equal(resolveScreen('c-16.0-bogus'), null);
});

test('guessCurrent matches looks-like resolution', () => {
  assert.equal(guessCurrent(1728, 1117), 'mbp16');
  assert.equal(guessCurrent(1, 1), 'mbp16');
});
