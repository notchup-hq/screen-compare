import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchScreens, nativeResolution } from '../js/detect.js';

test('exact match at pixel ratio 1', () => {
  assert.deepEqual(matchScreens(2256, 1504, 1), { native: [2256, 1504], matches: ['fw13'] });
});

test('scaled match: css size times pixel ratio', () => {
  assert.deepEqual(matchScreens(1728, 1117, 2).matches, ['mbp16']);
  assert.deepEqual(matchScreens(1536, 1024, 1.5).matches, ['sl138']);
});

test('fractional ratio that lands a pixel off still matches', () => {
  assert.deepEqual(nativeResolution(1868, 1245, 1.75), [3269, 2179]);
  assert.deepEqual(matchScreens(1868, 1245, 1.75).matches, ['sl15']);
});

test('portrait is swapped to landscape', () => {
  assert.deepEqual(matchScreens(1117, 1728, 2), { native: [3456, 2234], matches: ['mbp16'] });
});

test('generic sizes and monitors are never detected', () => {
  assert.deepEqual(matchScreens(1280, 800, 2).matches, []); // a generic 14" laptop panel
  assert.deepEqual(matchScreens(1920, 1080, 1).matches, []); // a 21.5" to 24" monitor
  assert.deepEqual(matchScreens(2560, 1440, 1).matches, []);
});

test('scaled looks-like sizes are not a match', () => {
  // MacBook Air 13 at its default scaling, and the same panel in "More space" (the Air 15's default).
  assert.deepEqual(matchScreens(1470, 956, 2).matches, []);
  assert.deepEqual(matchScreens(1710, 1107, 2).matches, []);
  assert.deepEqual(matchScreens(1280, 832, 2).matches, ['mba13']); // its native 2560 x 1664
});

test('no match returns the native size and no ids', () => {
  assert.deepEqual(matchScreens(2056, 1329, 2), { native: [4112, 2658], matches: [] });
});

test('uses the screens it is given', () => {
  const fixture = [{ id: 'x', resX: 100, resY: 50 }];
  assert.deepEqual(matchScreens(100, 50, 1, fixture).matches, ['x']);
  assert.deepEqual(matchScreens(100, 60, 1, fixture).matches, []);
});
