import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PROFILES, STORAGE_KEY, cleanName, cleanProfile, cleanProfiles, createMemory, defaultName, matchProfile, rememberedLine, signatureOf, upsertProfile,
} from '../js/memory.js';

const sig = (w, h, dpr = 1) => ({ w, h, dpr });
const office = { name: 'Office monitor', sig: sig(1920, 1080), saved: 100, size: 24, from: null, res: null, ratio: null, cal: null };
const laptop = { name: 'Laptop', sig: sig(1728, 1117, 2), saved: 200, from: 'mba15', size: null, res: null, ratio: null, cal: null };

/** A Storage stand-in. */
function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

test('signatureOf rounds the size and keeps the pixel ratio', () => {
  assert.deepEqual(signatureOf({ width: 1920.4, height: 1080, dpr: 1.25 }), { w: 1920, h: 1080, dpr: 1.25 });
});

test('matchProfile needs the exact size and the same pixel ratio', () => {
  const all = [office, laptop];
  assert.equal(matchProfile(all, sig(1920, 1080)), office);
  assert.equal(matchProfile(all, sig(1728, 1117, 2)), laptop);
  assert.equal(matchProfile(all, sig(1920, 1080, 1.004)), office, 'a float wobble still matches');
  assert.equal(matchProfile(all, sig(1920, 1080, 2)), null, 'same size, other pixel ratio');
  assert.equal(matchProfile(all, sig(1920, 1081)), null);
  assert.equal(matchProfile(all, sig(2560, 1440)), null);
  assert.equal(matchProfile([], sig(1920, 1080)), null);
});

test('matchProfile picks the right one among several, and the newest of two for one screen', () => {
  const second = { ...office, name: 'Second', sig: sig(2560, 1440), saved: 150 };
  const newer = { ...office, name: 'Newer office', saved: 300 };
  assert.equal(matchProfile([office, laptop, second], sig(2560, 1440)), second);
  assert.equal(matchProfile([office, newer, laptop], sig(1920, 1080)), newer);
});

test('upsertProfile keeps the name of the same screen and caps the list at five', () => {
  const renamed = { ...office, name: 'My desk' };
  const out = upsertProfile([renamed], { ...office, name: 'Default', size: 27, saved: 500 });
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'My desk');
  assert.equal(out[0].size, 27);

  let list = [];
  for (let i = 0; i < 7; i++) list = upsertProfile(list, { ...office, name: `S${i}`, sig: sig(1000 + i, 800), saved: i });
  assert.equal(list.length, MAX_PROFILES);
  assert.deepEqual(list.map((p) => p.name), ['S6', 'S5', 'S4', 'S3', 'S2'], 'the oldest two are gone');
});

test('cleanProfile drops entries a link could not hold', () => {
  assert.ok(cleanProfile(office));
  assert.equal(cleanProfile(null), null);
  assert.equal(cleanProfile({ ...office, name: '   ' }), null);
  assert.equal(cleanProfile({ ...office, sig: sig(0, 1080) }), null);
  assert.equal(cleanProfile({ ...office, sig: sig(1920, 1080, NaN) }), null);
  assert.equal(cleanProfile({ ...office, size: 3 }), null, 'a size out of range and no other way');
  assert.equal(cleanProfile({ ...laptop, from: 'no-such-model' }), null);
  assert.equal(cleanProfile({ ...office, size: null, from: null, cal: null }), null);
  const card = cleanProfile({ ...office, size: 24, cal: 3.9 });
  assert.equal(card.cal, 3.9);
  assert.equal(card.size, null, 'the card wins, as in a link');
});

test('cleanName trims and cuts to 40 characters', () => {
  assert.equal(cleanName('  Desk  '), 'Desk');
  assert.equal(cleanName(''), null);
  assert.equal(cleanName(42), null);
  assert.equal(cleanName('x'.repeat(60)).length, 40);
});

test('cleanProfiles lists the newest first and survives junk', () => {
  const out = cleanProfiles([office, 'junk', null, laptop, { name: 'x' }]);
  assert.deepEqual(out.map((p) => p.name), ['Laptop', 'Office monitor']);
  assert.deepEqual(cleanProfiles('nope'), []);
});

test('defaultName: the model, or the size', () => {
  assert.equal(defaultName({ basis: 'model', short: 'MacBook Air 15"' }), 'MacBook Air 15"');
  assert.equal(defaultName({ basis: 'size', diagonalIn: 21.5 }), '21.5" screen');
  assert.equal(defaultName({ basis: 'card', diagonalIn: 21.4321 }), '21.4" screen');
});

test('a working storage round-trips save, rename, remove and clear', () => {
  const s = fakeStorage();
  const mem = createMemory(() => s);
  assert.equal(mem.available(), true);
  assert.deepEqual(mem.list(), []);
  assert.equal(mem.save(office), true);
  assert.equal(mem.save(laptop), true);
  assert.deepEqual(mem.list().map((p) => p.name), ['Laptop', 'Office monitor']);
  assert.equal(JSON.parse(s.m.get(STORAGE_KEY)).v, 1);
  assert.equal([...s.m.keys()].length, 1, 'one key only');
  assert.equal(mem.rename(office.sig, '  Desk '), true);
  assert.equal(mem.rename(office.sig, '  '), false);
  assert.equal(mem.rename(sig(1, 1), 'Nope'), false);
  assert.equal(mem.list().find((p) => p.sig.w === 1920).name, 'Desk');
  assert.equal(mem.remove(laptop.sig), true);
  assert.deepEqual(mem.list().map((p) => p.name), ['Desk']);
  assert.equal(mem.clear(), true);
  assert.deepEqual(mem.list(), []);
  assert.equal(s.m.size, 0, 'forgetting everything leaves nothing behind');
});

test('blocked storage: the getter throws', () => {
  const mem = createMemory(() => { throw new Error('SecurityError'); });
  assert.equal(mem.available(), false);
  assert.deepEqual(mem.list(), []);
  assert.equal(mem.save(office), false);
  assert.equal(mem.rename(office.sig, 'x'), false);
  assert.equal(mem.remove(office.sig), false);
  assert.equal(mem.clear(), false);
});

test('blocked storage: no storage object at all', () => {
  const mem = createMemory(() => null);
  assert.equal(mem.available(), false);
  assert.deepEqual(mem.list(), []);
  assert.equal(mem.save(office), false);
});

test('blocked storage: reads throw', () => {
  const s = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  const mem = createMemory(() => s);
  assert.equal(mem.available(), false);
  assert.deepEqual(mem.list(), []);
  assert.equal(mem.save(office), false);
  assert.equal(mem.clear(), false);
});

test('full storage: reads work, writes throw', () => {
  const s = { ...fakeStorage(), setItem() { throw new Error('QuotaExceededError'); } };
  const mem = createMemory(() => s);
  assert.equal(mem.available(), true);
  assert.deepEqual(mem.list(), []);
  assert.equal(mem.save(office), false);
});

test('garbage or foreign data reads as empty and can be overwritten', () => {
  for (const bad of ['not json', '{"v":2,"profiles":[]}', '{"v":1}', 'null', '[]', '{"v":1,"profiles":"x"}']) {
    const s = fakeStorage({ [STORAGE_KEY]: bad });
    const mem = createMemory(() => s);
    assert.deepEqual(mem.list(), [], bad);
    assert.equal(mem.save(office), true, `overwrites ${bad}`);
    assert.equal(mem.list().length, 1);
  }
});

test('an edited entry in storage is cleaned on read', () => {
  const evil = { v: 1, profiles: [{ ...office, size: 5000 }, { ...laptop, from: 'x' }, laptop] };
  const mem = createMemory(() => fakeStorage({ [STORAGE_KEY]: JSON.stringify(evil) }));
  assert.deepEqual(mem.list().map((p) => p.name), ['Laptop']);
});

const at = (y, m, d) => new Date(y, m - 1, d, 12).getTime();

test('rememberedLine: the date, or "over a year ago" after twelve months', () => {
  const now = at(2026, 11, 19);
  assert.equal(rememberedLine(at(2026, 11, 18), now), 'Remembered on this browser, 18 Nov 2026');
  assert.equal(rememberedLine(at(2026, 9, 5), now), 'Remembered on this browser, 5 Sep 2026');
  assert.equal(rememberedLine(at(2025, 11, 19), now), 'Remembered on this browser, 19 Nov 2025', 'exactly a year is still fine');
  assert.equal(rememberedLine(at(2025, 11, 18), now), 'Remembered on this browser over a year ago, still right?');
  assert.equal(rememberedLine(at(2020, 1, 1), now), 'Remembered on this browser over a year ago, still right?');
  assert.equal(rememberedLine(NaN, now), 'Remembered on this browser', 'a broken date says nothing more');
});

test('forget and undo: take hands the profile back and saving it restores it unchanged', () => {
  const s = fakeStorage();
  const mem = createMemory(() => s);
  mem.save({ ...office, name: 'My desk', saved: at(2026, 11, 18) });
  mem.save(laptop);
  const gone = mem.take(office.sig);
  assert.equal(gone.name, 'My desk');
  assert.deepEqual(mem.list().map((p) => p.name), ['Laptop'], 'forgotten');
  assert.equal(mem.take(office.sig), null, 'nothing left to take');
  assert.equal(mem.save(gone), true, 'undo');
  const back = mem.list().find((p) => p.sig.w === 1920);
  assert.equal(back.name, 'My desk', 'the name survives the undo');
  assert.equal(back.saved, at(2026, 11, 18), 'and so does the date');
  assert.equal(back.size, 24);
  assert.equal(mem.take(laptop.sig).name, 'Laptop');
  assert.equal(mem.take(office.sig).name, 'My desk');
  assert.equal(s.m.size, 0, 'forgetting the last one leaves nothing behind');
});

test('forget with blocked storage takes nothing and does not throw', () => {
  const mem = createMemory(() => { throw new Error('SecurityError'); });
  assert.equal(mem.take(office.sig), null);
  const full = { ...fakeStorage({ [STORAGE_KEY]: JSON.stringify({ v: 1, profiles: [office] }) }), removeItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(createMemory(() => full).take(office.sig), null, 'a failed write does not pretend it forgot');
});
