import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accuracy, ACCURACY_TEXT } from '../js/accuracy.js';
import { resolveScreen } from '../js/state.js';

const mbp16 = resolveScreen('mbp16');
const win = { outerWidth: 1728, innerWidth: 1728 };
const base = { cal: null, screen: { width: 1728, height: 1117, dpr: 2 }, win, chosen: mbp16 };

test('a card calibration always wins', () => {
  assert.equal(accuracy({ ...base, cal: 4, win: { outerWidth: 2000, innerWidth: 1000 } }), 'calibrated');
});

test('exact native match is assumed, not flagged', () => {
  assert.equal(accuracy(base), 'assumed');
});

test('a scaled mode that matches no preset is not flagged', () => {
  assert.equal(accuracy({ ...base, screen: { width: 1800, height: 1169, dpr: 2 } }), 'assumed');
});

test('a 16:9 screen with a 16:10 pick is a mismatch', () => {
  assert.equal(accuracy({ ...base, screen: { width: 1920, height: 1080, dpr: 1 } }), 'mismatch');
});

test('native size of another preset is a mismatch', () => {
  assert.equal(accuracy({ ...base, chosen: resolveScreen('mbp14') }), 'mismatch');
});

test('browser zoom is detected from outer and inner width', () => {
  assert.equal(accuracy({ ...base, win: { outerWidth: 1728, innerWidth: 1382 } }), 'zoom');
  assert.equal(accuracy({ ...base, win: { outerWidth: 1000, innerWidth: 1250 } }), 'zoom');
});

test('scrollbar-sized differences are not zoom', () => {
  assert.equal(accuracy({ ...base, win: { outerWidth: 1728, innerWidth: 1713 } }), 'assumed');
});

test('a custom screen only gets the ratio check', () => {
  const c = resolveScreen('c-16.0-16x10');
  assert.equal(accuracy({ ...base, chosen: c }), 'assumed');
  assert.equal(accuracy({ ...base, chosen: c, screen: { width: 1920, height: 1080, dpr: 1 } }), 'mismatch');
});

test('every state has a label', () => {
  for (const k of ['calibrated', 'assumed', 'zoom', 'mismatch']) assert.ok(ACCURACY_TEXT[k]);
});
