import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseState, serializeState, resolveScreen, customSpec, startOverUrl } from '../js/state.js';

const defaults = { from: 'mbp16', to: 'mbp14' };
const base = { from: 'mbp16', size: null, res: null, ratio: null, to: 'mbp14', cal: null, fill: false };

test('round trip', () => {
  const s = { ...base, from: 'mba13', to: 'c-15.0-16x9', cal: 4.321, fill: true };
  assert.deepEqual(parseState(serializeState(s), defaults), s);
  assert.deepEqual(parseState(serializeState({ ...s, fill: false }), defaults), { ...s, fill: false });
});

test('invalid params fall back to defaults', () => {
  const s = parseState('?from=nope&to=c-120-16x10&cal=-3&fill=x&size=abc', defaults);
  assert.deepEqual(s, base);
  assert.equal(parseState('?to=c-14-1x0', defaults).to, 'mbp14');
});

test('a typed size is the link: size=21.5, no res unless it was edited', () => {
  const s = { ...base, from: null, size: 21.5, to: 'mbp14' };
  assert.equal(serializeState(s), '?size=21.5&to=mbp14');
  assert.deepEqual(parseState('?size=21.5&to=mbp14', { from: null, to: 'g14' }), s);
  const edited = { ...s, res: [2560, 1440] };
  assert.equal(serializeState(edited), '?size=21.5&res=2560x1440&to=mbp14');
  assert.deepEqual(parseState(serializeState(edited), { from: null, to: 'g14' }), edited);
});

test('ratio is only kept when there is a size and no usable resolution', () => {
  assert.equal(serializeState({ ...base, size: 24, ratio: '16x9' }), '?size=24&ratio=16x9&to=mbp14');
  assert.equal(parseState('?size=24&ratio=16x9&to=mbp14', defaults).ratio, '16x9');
  assert.equal(parseState('?size=24&ratio=16x9&res=1920x1080&to=mbp14', defaults).ratio, null);
  assert.equal(parseState('?ratio=16x9&to=mbp14', defaults).ratio, null);
  assert.equal(parseState('?size=24&ratio=bogus&to=mbp14', defaults).ratio, null);
});

test('a size must be 4 to 100 inches and a res must be a believable panel', () => {
  assert.equal(parseState('?size=3.9', defaults).size, null);
  assert.equal(parseState('?size=3', defaults).size, null);
  assert.equal(parseState('?size=6.1', defaults).size, 6.1);
  assert.equal(parseState('?size=100.1', defaults).size, null);
  assert.equal(parseState('?size=100', defaults).size, 100);
  assert.equal(parseState('?size=10', defaults).size, 10);
  assert.equal(parseState('?to=c-100.0-16x9', defaults).to, 'c-100.0-16x9');
  assert.equal(parseState('?to=c-100.5-16x9', defaults).to, 'mbp14');
  assert.equal(parseState('?size=24&res=1000x100', defaults).res, null);
  assert.equal(parseState('?size=24&res=junk', defaults).res, null);
  assert.equal(parseState('?res=1920x1080', defaults).res, null); // no size, no res
});

test('the link names one way to know your screen; cal stays alongside it and wins when used', () => {
  assert.equal(serializeState({ ...base, size: 24 }).includes('from='), false);
  assert.equal(serializeState({ ...base, from: null }).includes('from'), false);
  const s = parseState('?size=24&from=mba13&cal=3.9&to=mbp14', defaults);
  assert.equal(s.size, 24);
  assert.equal(s.cal, 3.9);
});

test('an older link with a custom from becomes a typed size', () => {
  const s = parseState('?from=c-16.0-16x10&to=mbp14', defaults);
  assert.equal(s.size, 16);
  assert.equal(s.ratio, '16x10');
  assert.equal(s.from, 'mbp16'); // the default, never the custom spec
  assert.equal(parseState('?from=c-16.0-16x10&size=27&to=mbp14', defaults).size, 27);
});

test('custom screen', () => {
  assert.equal(customSpec(16, '16x10'), 'c-16.0-16x10');
  const c = resolveScreen('c-16.0-16x10');
  assert.equal(c.diagonalIn, 16);
  assert.ok(c.custom);
  assert.equal(resolveScreen('c-16.0-bogus'), null);
  assert.equal(resolveScreen('c-34.0-21x9').ratioId, '21x9');
  assert.ok(resolveScreen('c-99.0-16x10'));
  assert.ok(resolveScreen('c-6.0-16x10'));
  assert.equal(resolveScreen('c-3.0-16x10'), null);
});

test('sample content is off by default and on only with fill=1', () => {
  assert.equal(parseState('', defaults).fill, false);
  assert.equal(parseState('?fill=0', defaults).fill, false);
  assert.equal(parseState('?fill=1', defaults).fill, true);
  assert.ok(!serializeState(base).includes('fill'));
  assert.ok(serializeState({ ...base, fill: true }).includes('fill=1'));
});

test('a missing from stays null so the page can ask', () => {
  assert.equal(parseState('', { from: null, to: 'mbp14' }).from, null);
});

test('start over drops the whole query and keeps the path', () => {
  assert.equal(startOverUrl('/app/', ''), '/app/');
  assert.equal(startOverUrl('/', '#top'), '/#top');
});

test('reset fine-tune: no cal in the link', () => {
  const s = base;
  assert.ok(!serializeState(s).includes('cal'));
  assert.equal(parseState(serializeState({ ...s, cal: 4.2 }), defaults).cal, 4.2);
  assert.equal(parseState(serializeState(s), defaults).cal, null);
});

test('after start over the link names no comparison', () => {
  const p = new URLSearchParams('');
  assert.equal(resolveScreen(p.get('to')), null);
});
