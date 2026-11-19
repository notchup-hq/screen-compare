import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREENS } from '../js/screens.js';
import { resolveScreen } from '../js/state.js';
import { smallerThan, smallerThanSize, sizeLabel } from '../js/suggest.js';

const area = (id) => {
  const s = resolveScreen(id);
  return s.widthMm * s.heightMm;
};

test('mapped screens go to a smaller preset', () => {
  for (const id of ['mbp16', 'mbp14', 'mba15', 'sl15', 'sl138', 'g16', 'g173', 'g156', 'g14']) {
    assert.ok(area(smallerThan(id)) < area(id), `${id} -> ${smallerThan(id)}`);
  }
  assert.equal(smallerThan('mbp16'), 'mbp14');
  assert.equal(smallerThan('mbp14'), 'mba13');
});

test('everything else falls back to a real preset', () => {
  assert.equal(smallerThan(null), 'mbp14');
  assert.equal(smallerThan('c-15.0-16x9'), 'mbp14');
  for (const s of SCREENS) assert.ok(resolveScreen(smallerThan(s.id)), s.id);
});

test('a typed size suggests a clearly smaller generic laptop, or the 14" MacBook Pro', () => {
  assert.equal(smallerThanSize(16), 'g14');
  assert.equal(smallerThanSize(15.6), 'g14');
  assert.equal(smallerThanSize(14.5), 'g133');
  assert.equal(smallerThanSize(14.2), 'mbp14');
  assert.equal(smallerThanSize(13), 'mbp14');
  assert.equal(smallerThanSize(21.5), 'mbp14'); // monitors
  assert.equal(smallerThanSize(null), 'mbp14');
});

test('size label comes from the short name', () => {
  assert.equal(sizeLabel(resolveScreen('mbp14')), '14"');
  assert.equal(sizeLabel(resolveScreen('sl138')), '13.8"');
  assert.equal(sizeLabel(resolveScreen('fw13')), '13"');
  assert.equal(sizeLabel(resolveScreen('g156')), '15.6"');
});

test('custom screens use their diagonal, and unnamed ones round it', () => {
  assert.equal(sizeLabel(resolveScreen('c-15.0-16x9')), '15"');
  assert.equal(sizeLabel({ diagonalIn: 13.6 }), '14"');
});

test('every preset has a short name with its size in it', () => {
  for (const s of SCREENS) assert.match(s.short ?? '', /\d"/, s.id);
});
