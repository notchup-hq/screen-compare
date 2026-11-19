import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREENS } from '../js/screens.js';
import { resolveScreen } from '../js/state.js';
import { GROUPS, SIZE_PILLS, MONITOR_PILLS, STEP2_SIZES, MODEL_PILL, groupedScreens, laptopModels, defaultRatio, kindForDiagonal, otherSizeSpec, otherChoice, pillFor, specFor } from '../js/compare-options.js';

test('every preset belongs to a known group, and the lists keep them all', () => {
  for (const s of SCREENS) assert.ok(GROUPS.includes(s.group), `${s.id}: ${s.group}`);
  const grouped = groupedScreens();
  assert.equal(grouped.flatMap((g) => g.screens).length, SCREENS.length);
  assert.equal(grouped.at(-1).group, 'Monitors');
});

test('size pills point at real generic presets', () => {
  for (const p of SIZE_PILLS) {
    const s = resolveScreen(p.preset);
    assert.ok(s && s.group === 'Generic laptops' && s.kind === 'laptop', p.id);
    assert.ok(p.label.startsWith(p.id), p.id);
  }
});

test('monitor pills point at generic monitors and map both ways', () => {
  for (const p of MONITOR_PILLS) {
    const s = resolveScreen(p.preset);
    assert.ok(s && s.group === 'Monitors' && s.kind === 'monitor' && !s.source, p.id);
    assert.equal(specFor(p.id, null), p.preset);
    assert.deepEqual(pillFor(p.preset), { pill: p.id, ratioId: null });
  }
  assert.equal(MONITOR_PILLS.length, SCREENS.filter((s) => s.kind === 'monitor').length);
});

test('the model list for your own screen is laptop models with a source', () => {
  const ids = laptopModels().flatMap((g) => g.screens.map((s) => s.id));
  assert.ok(ids.includes('mbp14') && ids.includes('fw13') && ids.includes('sl15'));
  assert.ok(!ids.includes('g14') && !ids.includes('m24'));
  assert.deepEqual(laptopModels().map((g) => g.group), ['Apple', 'Framework', 'Microsoft']);
});

test('the second question offers four generic sizes by the kind of your screen', () => {
  assert.deepEqual(Object.keys(STEP2_SIZES), ['laptop', 'monitor']);
  for (const [kind, items] of Object.entries(STEP2_SIZES)) {
    assert.equal(items.length, 4, kind);
    for (const p of items) {
      const s = resolveScreen(p.preset);
      assert.ok(s && s.kind === kind && !s.source, p.preset);
      assert.ok(p.name.includes(kind) && p.label.startsWith(String(Math.floor(s.diagonalIn))), p.preset);
    }
  }
  assert.deepEqual(STEP2_SIZES.laptop.map((p) => p.label), ['13"', '14"', '15"', '16"']);
  assert.deepEqual(STEP2_SIZES.monitor.map((p) => p.label), ['24"', '27"', '32"', '34" wide']);
});

test('a screen of 19 inches or more counts as a monitor', () => {
  assert.equal(kindForDiagonal(13.3), 'laptop');
  assert.equal(kindForDiagonal(18.9), 'laptop');
  assert.equal(kindForDiagonal(19), 'monitor');
  assert.equal(kindForDiagonal(27), 'monitor');
  assert.equal(kindForDiagonal(null), 'laptop');
  assert.equal(kindForDiagonal(NaN), 'laptop');
});

test('another size typed in the second question becomes a preset or a custom size', () => {
  assert.equal(otherSizeSpec(14, 'laptop'), 'g14');
  assert.equal(otherSizeSpec(27, 'monitor'), 'm27');
  assert.equal(otherSizeSpec(21.5, 'monitor'), 'm215');
  assert.equal(otherSizeSpec(22, 'laptop'), 'c-22.0-16x10');
  assert.equal(otherSizeSpec(22, 'monitor'), 'c-22.0-16x9');
  assert.equal(otherSizeSpec(15.64, 'laptop'), 'c-15.6-16x10');
  assert.equal(otherSizeSpec(9.9, 'laptop'), null);
  assert.equal(otherSizeSpec(100.1, 'monitor'), null);
  assert.equal(otherSizeSpec(100, 'monitor'), 'c-100.0-16x9');
  assert.ok(resolveScreen('c-100.0-16x9'));
  assert.equal(otherSizeSpec(NaN, 'monitor'), null);
  for (const spec of [otherSizeSpec(22, 'laptop'), otherSizeSpec(34, 'monitor')]) assert.ok(resolveScreen(spec), spec);
});

test('a pill starts with its preset, and another ratio gives a custom size', () => {
  assert.equal(specFor('14', defaultRatio('14')), 'g14');
  assert.equal(specFor('15', defaultRatio('15')), 'g156');
  assert.equal(defaultRatio('15'), '16x9');
  assert.equal(specFor('14', '16x9'), 'c-14.0-16x9');
  assert.equal(specFor('13', '3x2'), 'c-13.3-3x2');
  assert.equal(specFor(MODEL_PILL, null, 'mbp14'), 'mbp14');
  assert.equal(specFor(MODEL_PILL, null, ''), null);
  assert.equal(specFor('99', null), null);
});

test('pill and spec round trip', () => {
  for (const p of SIZE_PILLS) {
    for (const ratioId of ['16x10', '16x9', '3x2']) {
      const spec = specFor(p.id, ratioId);
      assert.ok(resolveScreen(spec), spec);
      assert.deepEqual(pillFor(spec), { pill: p.id, ratioId }, spec);
    }
  }
});

test('anything else belongs to the model list', () => {
  assert.deepEqual(pillFor('mbp14'), { pill: MODEL_PILL, ratioId: null });
  assert.deepEqual(pillFor('c-22.0-16x9'), { pill: MODEL_PILL, ratioId: null });
  assert.deepEqual(pillFor('nope'), { pill: null, ratioId: null });
  assert.deepEqual(pillFor(null), { pill: null, ratioId: null });
});

test('other size and model: the one changed last is used', () => {
  const base = { kind: 'laptop' };
  const sizeThenModel = otherChoice({ ...base, active: 'model', sizeText: '22', modelId: 'mbp14' });
  assert.equal(sizeThenModel.use, 'model');
  assert.equal(sizeThenModel.label, 'Show MacBook Pro 14"');
  const modelThenSize = otherChoice({ ...base, active: 'size', sizeText: '22', modelId: 'mbp14' });
  assert.equal(modelThenSize.use, 'size');
  assert.equal(modelThenSize.label, 'Show 22"');
  assert.ok(modelThenSize.spec);
});

test('other size and model: an empty active control hands over to the other', () => {
  assert.equal(otherChoice({ kind: 'laptop', active: 'size', sizeText: '', modelId: 'mbp14' }).use, 'model');
  assert.equal(otherChoice({ kind: 'laptop', active: 'model', sizeText: '15', modelId: '' }).use, 'size');
  const none = otherChoice({ kind: 'laptop', active: 'size', sizeText: ' ', modelId: '' });
  assert.deepEqual(none, { use: null, spec: null, label: 'Show' });
});

test('other size label shows the rounded size the outline uses', () => {
  assert.equal(otherChoice({ kind: 'laptop', active: 'size', sizeText: '15,6' }).label, 'Show 15.6"');
  assert.equal(otherChoice({ kind: 'laptop', active: 'size', sizeText: '22.04' }).label, 'Show 22"');
});

test('other size out of range or not a number has no spec and stays the used one', () => {
  for (const sizeText of ['5', '500', 'abc']) {
    const c = otherChoice({ kind: 'laptop', active: 'size', sizeText, modelId: 'mbp14' });
    assert.deepEqual(c, { use: 'size', spec: null, label: 'Show' }, sizeText);
  }
});

test('other size keeps the custom spec it came in with while the size is unchanged', () => {
  const keep = { size: 17.3, spec: 'c-17.3-16x9' };
  assert.equal(otherChoice({ kind: 'laptop', active: 'size', sizeText: '17.3', keep }).spec, keep.spec);
  assert.notEqual(otherChoice({ kind: 'laptop', active: 'size', sizeText: '17.5', keep }).spec, keep.spec);
});
