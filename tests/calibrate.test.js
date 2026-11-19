import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardFit } from '../js/calibrate.js';

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
