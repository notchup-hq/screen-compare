// Every English text the page shows has a Finnish translation, and the dictionary holds nothing else.
// The texts come from t('…') calls in js/, the static markup of index.html and the card drawer, and the
// screen data (generic sizes, list headings, kinds, the sizes of the second question).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { FI } from '../js/fi.js';
import { TEXT_ATTRS, keyOf, num, setLang, t } from '../js/i18n.js';
import { SCREENS } from '../js/screens.js';
import { GROUPS, KINDS, STEP2_SIZES } from '../js/compare-options.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const jsFiles = readdirSync(new URL('../js/', import.meta.url)).filter((f) => f.endsWith('.js') && f !== 'fi.js');

/** The texts of a piece of static markup: text between tags and the text attributes, not inside script, style or noscript. */
export function markupTexts(html) {
  let body = html.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<head>[\s\S]*<\/head>/, '');
  const texts = [];
  const own = /<(\w+)[^>]*\slang="[^"]*"[^>]*>[^<]*<\/\1>/g; // buttons that name themselves in their own language
  body = body.replace(own, '');
  for (const m of body.matchAll(/>([^<]+)</g)) texts.push(keyOf(m[1].replace(/&minus;/g, '−').replace(/&amp;/g, '&')));
  for (const tag of body.matchAll(/<[a-z][^>]*>/g)) {
    for (const a of TEXT_ATTRS) {
      const v = new RegExp(`\\s${a}="([^"]*)"`).exec(tag[0]);
      if (v) texts.push(v[1]);
    }
  }
  // Symbols, numbers and the app name need no translation.
  return texts.filter((x) => /[a-z]{2}/i.test(x) && x !== 'Screen compare' && !/^[\d."″ →]+$/.test(x));
}

function codeTexts(src) {
  const out = [];
  for (const m of src.matchAll(/\bt\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)) {
    assert.ok(!m[2].includes('${'), `t() takes a fixed text, not a template: ${m[2]}`);
    out.push(m[2].replace(/\\(.)/g, '$1'));
  }
  return out;
}

function allTexts() {
  const calibrate = read('js/calibrate.js');
  const template = /body\.innerHTML = `([\s\S]*?)`;/.exec(calibrate)[1];
  return new Set([
    ...jsFiles.flatMap((f) => codeTexts(read(`js/${f}`))),
    ...markupTexts(read('index.html')),
    ...markupTexts(template),
    keyOf(/<title>([^<]*)<\/title>/.exec(read('index.html'))[1]),
    ...SCREENS.filter((s) => !s.source).flatMap((s) => [s.name, s.short]),
    ...GROUPS.filter((g) => !['Apple', 'Framework', 'Microsoft', 'iPhone', 'Galaxy', 'Pixel'].includes(g)),
    ...KINDS.map((k) => k.label),
    ...Object.values(STEP2_SIZES).flat().flatMap((p) => [p.label, p.name]).filter((x) => /[a-z]{2}/i.test(x)),
  ]);
}

test('every text has a Finnish translation', () => {
  const missing = [...allTexts()].filter((x) => !(x in FI));
  assert.deepEqual(missing, []);
});

test('the dictionary has no texts the page no longer shows', () => {
  const used = allTexts();
  assert.deepEqual(Object.keys(FI).filter((k) => !used.has(k)), []);
});

test('a translation keeps the placeholders of its English text', () => {
  const names = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const [en, fi] of Object.entries(FI)) assert.deepEqual(names(fi), names(en), en);
});

test('t() fills placeholders and writes numbers the Finnish way', () => {
  try {
    assert.equal(t('{size}" screen', { size: 13.3 }), '13.3" screen');
    assert.equal(t('No such text'), 'No such text');
    setLang('fi');
    assert.equal(t('{size}" screen', { size: 13.3 }), `13,3" ${FI['{size}" screen'].split('" ')[1]}`);
    assert.equal(num('Surface Laptop 13.8"'), 'Surface Laptop 13,8"');
    assert.equal(t('No such text'), 'No such text');
  } finally {
    setLang('en');
  }
});
