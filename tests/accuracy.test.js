import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accuracy, accuracyText } from '../js/accuracy.js';
import { resolveScreen } from '../js/state.js';
import { yourScreen } from '../js/scale.js';

const mbp16 = { ...resolveScreen('mbp16'), basis: 'model' };
const win = { outerWidth: 1728, innerWidth: 1728 };
const base = { your: mbp16, screen: { width: 1728, height: 1117, dpr: 2 }, win };

test('a card measurement always wins', () => {
  const card = yourScreen({ cal: 4, css: base.screen, dpr: 2 });
  assert.equal(accuracy({ ...base, your: card, win: { outerWidth: 2000, innerWidth: 1000 } }), 'card');
});

test('a typed size is exact whatever the zoom or the screen', () => {
  const size = yourScreen({ sizeIn: 24, css: { width: 1920, height: 1080 }, dpr: 1 });
  assert.equal(accuracy({ ...base, your: size, screen: { width: 1920, height: 1080, dpr: 1 }, win: { outerWidth: 2000, innerWidth: 1000 } }), 'size');
});

test('exact native match with a picked model is not flagged', () => {
  assert.equal(accuracy(base), 'model');
});

test('a model that was recognised from the screen says so', () => {
  assert.equal(accuracy({ ...base, detected: true }), 'detected');
});

test('a scaled mode that matches no preset is not flagged', () => {
  assert.equal(accuracy({ ...base, screen: { width: 1800, height: 1169, dpr: 2 } }), 'model');
});

test('a 16:9 screen with a 16:10 pick is a mismatch', () => {
  assert.equal(accuracy({ ...base, screen: { width: 1920, height: 1080, dpr: 1 } }), 'mismatch');
});

test('native size of another preset is a mismatch', () => {
  assert.equal(accuracy({ ...base, your: { ...resolveScreen('mbp14'), basis: 'model' } }), 'mismatch');
});

test('browser zoom is detected from outer and inner width', () => {
  assert.equal(accuracy({ ...base, win: { outerWidth: 1728, innerWidth: 1382 } }), 'zoom');
  assert.equal(accuracy({ ...base, win: { outerWidth: 1000, innerWidth: 1250 } }), 'zoom');
});

test('scrollbar-sized differences are not zoom', () => {
  assert.equal(accuracy({ ...base, win: { outerWidth: 1728, innerWidth: 1713 } }), 'model');
});

test('a custom screen only gets the ratio check', () => {
  const c = { ...resolveScreen('c-16.0-16x10'), basis: 'model' };
  assert.equal(accuracy({ ...base, your: c }), 'model');
  assert.equal(accuracy({ ...base, your: c, screen: { width: 1920, height: 1080, dpr: 1 } }), 'mismatch');
});

test('the labels name where the size came from', () => {
  const size = yourScreen({ sizeIn: 21.5, css: { width: 1920, height: 1080 }, dpr: 1 });
  assert.equal(accuracyText('size', size), 'Real size · from your 21.5" screen size');
  assert.equal(accuracyText('card', size), 'Real size · measured with a card ✓');
  const air = resolveScreen('mba13');
  assert.equal(accuracyText('detected', air), 'Real size · based on MacBook Air 13" (detected)');
  assert.equal(accuracyText('model', air), 'Real size · based on MacBook Air 13"');
  for (const k of ['zoom', 'mismatch']) assert.match(accuracyText(k, air), /^Approximate/);
});
