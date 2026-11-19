import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREENS } from '../js/screens.js';
import { resolveScreen } from '../js/state.js';
import { GROUPS, SIZE_PILLS, MODEL_PILL, groupedScreens, defaultRatio, pillFor, specFor } from '../js/compare-options.js';

test('every preset belongs to a known group, and the lists keep them all', () => {
  for (const s of SCREENS) assert.ok(GROUPS.includes(s.group), `${s.id}: ${s.group}`);
  const grouped = groupedScreens();
  assert.equal(grouped.flatMap((g) => g.screens).length, SCREENS.length);
  assert.equal(grouped.at(-1).group, 'Generic sizes');
});

test('size pills point at real generic presets', () => {
  for (const p of SIZE_PILLS) {
    const s = resolveScreen(p.preset);
    assert.ok(s && s.group === 'Generic sizes', p.id);
    assert.ok(p.label.startsWith(p.id), p.id);
  }
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
