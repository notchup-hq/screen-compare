import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardFit, rulerFit } from '../js/calibrate.js';

test('the card lies flat when its long side fits', () => {
  const fit = cardFit(4, 400); // 342 x 216 px
  assert.equal(fit.layout, 'flat');
  assert.ok(fit.width > fit.height);
});

test('the card stands upright when only its short side fits (a phone)', () => {
  const fit = cardFit(6.1, 335); // 522 px long, 329 px short
  assert.equal(fit.layout, 'upright');
  assert.ok(fit.width <= 335 && fit.height > fit.width);
});

test('on a screen narrower than a card the card is upright and cut', () => {
  assert.equal(cardFit(6.4, 295).layout, 'cut');
});

test('the ruler is the longest that fits: 10 cm or 4 inches on a laptop, 5 cm or 2 inches on a phone', () => {
  assert.deepEqual(rulerFit(3.78, 460, 'cm'), { unit: 'cm', count: 10, px: 378 });
  assert.equal(rulerFit(3.78, 460, 'in').count, 4);
  // A phone held upright: about 360 CSS px across, 6 px per mm.
  assert.equal(rulerFit(6, 340, 'cm').count, 5);
  assert.equal(rulerFit(6, 340, 'in').count, 2);
  // Narrower than the shortest ruler: still the shortest, never nothing.
  assert.equal(rulerFit(6, 100, 'cm').count, 3);
});
