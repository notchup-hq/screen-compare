// The page's two languages. English is the source: every text in the code and in index.html is
// English, and that English text is also the key into the Finnish dictionary (js/fi.js). A missing
// key shows the English text; tests/i18n.test.js checks that none is missing and none is left over.
// No DOM at import, so the pure modules (and their tests) can use t().

import { FI } from './fi.js';

export const LANGS = ['en', 'fi'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let lang = 'en';
const listeners = [];

export const getLang = () => lang;

/** Switch the language and tell everyone who listens (they redraw their texts). */
export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  for (const fn of listeners) fn(lang);
}

export function onLangChange(fn) {
  listeners.push(fn);
}

/** A number (or the number in a string, like 13.3") as people write it: 13,3 in Finnish. */
export function num(x) {
  const s = String(x);
  return lang === 'fi' ? s.replace(/(\d)\.(\d)/g, '$1,$2') : s;
}

/** A length in mm as centimetres with one decimal: "1.9 cm", in Finnish "1,9 cm". */
export const cm = (mm) => `${num((mm / 10).toFixed(1))} cm`;

/** A date as "5 Sep 2026", in Finnish "5.9.2026". */
export function date(d) {
  return lang === 'fi'
    ? `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`
    : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * `text` in the current language, with {name} filled from `vars`. Numbers in `vars` are written the
 * local way; strings go in as they are.
 */
export function t(text, vars = {}) {
  const s = lang === 'fi' ? (FI[text] ?? text) : text;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? (typeof vars[k] === 'number' ? num(vars[k]) : String(vars[k])) : m));
}

/** A screen's short name: a model's own name, or a generic size ("13.3\" laptop") in the current language. */
export const screenName = (screen) => num(t(screen.short ?? screen.name));

/** The attributes of static markup that hold text. */
export const TEXT_ATTRS = ['aria-label', 'title', 'placeholder', 'alt'];

/** One key from a run of markup text: trimmed, inner whitespace as single spaces. Shared with the test. */
export const keyOf = (text) => text.trim().replace(/\s+/g, ' ');

// What localize() last wrote into each text node and attribute, and the English it came from. A value
// that has changed since was set by a script, so its current text becomes the new English.
const seenText = new WeakMap();
const seenAttrs = new WeakMap();

/**
 * Translate the static text under `root`: every text node and the text attributes, from the English
 * each had when first seen. Texts the scripts set themselves are redrawn by their owners.
 */
export function localize(root) {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => (n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE' || n.nodeName === 'NOSCRIPT'
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walker.currentNode; n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      let o = seenText.get(n);
      if (!o || o.shown !== n.nodeValue) {
        const key = keyOf(n.nodeValue);
        if (!key) continue;
        o = { key, lead: /^\s/.test(n.nodeValue) ? ' ' : '', tail: /\s$/.test(n.nodeValue) ? ' ' : '' };
        seenText.set(n, o);
      }
      o.shown = `${o.lead}${t(o.key)}${o.tail}`;
      n.nodeValue = o.shown;
    } else {
      if (!seenAttrs.has(n)) seenAttrs.set(n, {});
      const all = seenAttrs.get(n);
      for (const a of TEXT_ATTRS) {
        const v = n.getAttribute(a);
        if (!v) continue;
        if (!all[a] || all[a].shown !== v) all[a] = { key: v };
        all[a].shown = t(all[a].key);
        n.setAttribute(a, all[a].shown);
      }
    }
  }
}
