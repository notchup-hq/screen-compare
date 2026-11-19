import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cssPxPerCm, usableResolution, validSize, yourScreen, DEFAULT_PX_PER_MM } from '../js/scale.js';
import { resolveScreen } from '../js/state.js';

const near = (a, b, tol = 0.05) => assert.ok(Math.abs(a - b) <= tol, `${a} is not within ${tol} of ${b}`);

test('cssPxPerCm: ppi over pixel ratio over 2.54', () => {
  near(cssPxPerCm({ diagonalIn: 21.5, resX: 1920, resY: 1080, dpr: 1 }), 40.34, 0.01);
  near(cssPxPerCm({ diagonalIn: 13.6, resX: 2560, resY: 1664, dpr: 2 }), 44.19, 0.01);
});

test('a 21.5" 1920x1080 monitor has the same size at pixel ratio 1 and at 1.25 (Windows scaling)', () => {
  const a = yourScreen({ sizeIn: 21.5, css: { width: 1920, height: 1080 }, dpr: 1 });
  const b = yourScreen({ sizeIn: 21.5, css: { width: 1536, height: 864 }, dpr: 1.25 });
  near(a.widthMm / 10, 47.6, 0.05);
  near(a.heightMm / 10, 26.8, 0.05);
  near(a.widthMm, b.widthMm, 0.01);
  near(a.heightMm, b.heightMm, 0.01);
  // The outline in CSS px for the same physical size differs by exactly the pixel ratio.
  near(a.pxPerMm * 10, 40.34, 0.01);
  near(a.pxPerMm / b.pxPerMm, 1.25, 0.001);
  // The same, with the native resolution typed in: dpr then matters.
  const c = yourScreen({ sizeIn: 21.5, res: [1920, 1080], css: { width: 1536, height: 864 }, dpr: 1.25 });
  near(c.pxPerMm, b.pxPerMm, 0.001);
  near(c.widthMm, a.widthMm, 0.01);
});

test('MacBook Air 13.6" 2560x1664 at pixel ratio 2', () => {
  const scaled = yourScreen({ sizeIn: 13.6, css: { width: 1280, height: 832 }, dpr: 2 });
  near(scaled.pxPerMm * 10, 44.19, 0.05);
  // At the default looks-like size the CSS pixels are smaller, so there are more per cm.
  const def = yourScreen({ sizeIn: 13.6, css: { width: 1470, height: 956 }, dpr: 2 });
  near(def.pxPerMm * 10, 50.76, 0.05);
  near(def.widthMm / 10, 28.9, 0.1);
  // A typed resolution is the pixels the display is currently set to (here the 2940 x 1912 backing
  // store of the default mode), so it agrees with the unedited value. The 2560 x 1664 panel size
  // would only be right in the 1280 x 832 mode above.
  const typed = yourScreen({ sizeIn: 13.6, res: [2940, 1912], css: { width: 1470, height: 956 }, dpr: 2 });
  near(typed.pxPerMm * 10, 50.76, 0.05);
  assert.deepEqual(typed.res, [2940, 1912]);
  const native = yourScreen({ sizeIn: 13.6, res: [2560, 1664], css: { width: 1280, height: 832 }, dpr: 2 });
  near(native.pxPerMm * 10, 44.19, 0.05);
});

test('a card measurement overrides the diagonal and the model', () => {
  const css = { width: 1920, height: 1080 };
  const card = yourScreen({ cal: 4, sizeIn: 27, preset: resolveScreen('mbp14'), css, dpr: 1 });
  assert.equal(card.basis, 'card');
  assert.equal(card.pxPerMm, 4);
  near(card.widthMm, 480, 0.001);
  near(card.heightMm, 270, 0.001);
  near(card.diagonalIn, 21.7, 0.05);
});

test('a size beats a model, a model is the fallback, nothing gives null', () => {
  const css = { width: 1728, height: 1117 };
  const mbp = resolveScreen('mbp16');
  assert.equal(yourScreen({ sizeIn: 21.5, preset: mbp, css, dpr: 2 }).basis, 'size');
  const m = yourScreen({ preset: mbp, css, dpr: 2 });
  assert.equal(m.basis, 'model');
  near(m.pxPerMm, 1728 / mbp.widthMm, 1e-9);
  assert.equal(yourScreen({ css, dpr: 2 }), null);
  assert.equal(yourScreen({ sizeIn: 3, css, dpr: 2 }), null);
});

test('without a usable resolution the aspect ratio has to be given', () => {
  const css = { width: 0, height: 0 };
  assert.equal(yourScreen({ sizeIn: 24, css, dpr: 1 }), null);
  assert.equal(yourScreen({ sizeIn: 24, css: { width: 1000, height: 100 }, dpr: 1 }), null);
  const r = yourScreen({ sizeIn: 24, ratio: 16 / 9, css: { width: 1000, height: 100 }, dpr: 1 });
  near(r.widthMm, 531.3, 0.1);
  near(r.pxPerMm, 1000 / r.widthMm, 1e-9);
});

test('sizes and resolutions are validated', () => {
  assert.ok(validSize(21.5) && validSize(4) && validSize(6.1) && validSize(100));
  assert.ok(!validSize(3.9) && !validSize(100.1) && !validSize(NaN) && !validSize(null));
  assert.ok(usableResolution(1920, 1080) && usableResolution(1080, 1920) && usableResolution(3440, 1440));
  assert.ok(!usableResolution(0, 1080) && !usableResolution(1000, 100) && !usableResolution(NaN, 5));
});

test('the default scale is 96 px per inch', () => {
  near(DEFAULT_PX_PER_MM * 25.4, 96, 1e-9);
});

test('a typed size on a phone held upright is taller than it is wide', () => {
  const phone = yourScreen({ sizeIn: 6.1, css: { width: 390, height: 844 }, dpr: 3 });
  assert.ok(phone.heightMm > phone.widthMm);
  near(phone.heightMm, 140.6, 0.5); // 6.1" at 844:390
  const turned = yourScreen({ sizeIn: 6.1, css: { width: 844, height: 390 }, dpr: 3 });
  near(turned.widthMm, phone.heightMm, 0.01);
  near(turned.pxPerMm, phone.pxPerMm, 0.0001);
});

test('a phone model held upright gets the same scale as held sideways', () => {
  const model = resolveScreen('ip17');
  const up = yourScreen({ preset: model, css: { width: 402, height: 874 }, dpr: 3 });
  const side = yourScreen({ preset: model, css: { width: 874, height: 402 }, dpr: 3 });
  assert.ok(up.heightMm > up.widthMm);
  near(up.pxPerMm, side.pxPerMm, 0.0001);
  near(up.pxPerMm, 2622 / 3 / model.widthMm, 0.05); // CSS px across the long side
});
