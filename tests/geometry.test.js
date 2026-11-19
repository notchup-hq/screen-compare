import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizeFromDiagonal, pxPerMm, areaRatio, fitsInside, overflowPerSide } from '../js/geometry.js';
import { resolveScreen } from '../js/state.js';

const near = (a, b, tol = 0.2) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('16:10 16" panel size', () => {
  const s = sizeFromDiagonal(16, 16 / 10);
  near(s.widthMm, 344.6);
  near(s.heightMm, 215.4);
});

test('MacBook Pro 16" and 14" from real panel numbers', () => {
  const a = resolveScreen('mbp16');
  const b = resolveScreen('mbp14');
  // Cross-check against Apple's stated 254 ppi: 3456 px / 254 * 25.4 = 345.6 mm.
  near(a.widthMm, (3456 / 254) * 25.4, 0.5);
  near(a.heightMm, (2234 / 254) * 25.4, 0.5);
  near(b.widthMm, (3024 / 254) * 25.4, 0.5);
  near(b.heightMm, (1964 / 254) * 25.4, 0.5);
  assert.ok(fitsInside(b, a));
  assert.ok(!fitsInside(a, b));
  const r = areaRatio(b, a);
  assert.ok(r > 0.74 && r < 0.78, `area ratio ${r}`);
});

test('px per mm', () => {
  near(pxPerMm(1728, 345.6), 5.0, 0.01);
});

test('overflow per side is half the size difference', () => {
  const a = resolveScreen('mbp16');
  const b = resolveScreen('mbp14');
  const o = overflowPerSide(a, b);
  near(o.sideMm, (a.widthMm - b.widthMm) / 2, 1e-9);
  assert.ok(o.sideMm > 0 && o.topMm > 0);
});
