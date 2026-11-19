// The size fields (your screen, and "Other size"): a plain text field with our own − and + buttons.
// Pure helpers first (unit tested), then the small DOM wiring. The placeholder is only a hint: an
// empty field never counts as a value, but stepping from empty starts at the placeholder's number.

import { SIZE_MAX_IN, SIZE_MIN_IN } from './scale.js';

const SIZE_STEP_IN = 0.5;
const EPS = 1e-9;

/** A number from what was typed: "15,6" and "15.6" both work. Null when it is not a number. Range is not checked. */
export function parseSize(text) {
  const t = String(text ?? '').trim();
  if (!/^(\d+[.,]?\d*|[.,]\d+)$/.test(t)) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** What a size field may hold: digits and at most one decimal separator (a dot or a comma). Everything else is dropped. */
export function cleanSizeText(text) {
  let seenSeparator = false;
  let out = '';
  for (const ch of String(text ?? '')) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if ((ch === '.' || ch === ',') && !seenSeparator) { seenSeparator = true; out += ch; }
  }
  return out;
}

/**
 * The direction a key steps the size: +1 (larger) or -1 (smaller), 0 for any other key. Left and Right
 * follow the − and + buttons either side of the field, Up and Down are the usual spinbutton keys, and
 * the + and − keys work too (a bare = counts as +, it is the same key on most keyboards).
 */
export function stepDirection(key) {
  if (key === 'ArrowUp' || key === 'ArrowRight' || key === '+' || key === '=') return 1;
  if (key === 'ArrowDown' || key === 'ArrowLeft' || key === '-') return -1;
  return 0;
}

/** C clears the field, so someone who wants to retype the number is not stuck now that Left and Right step it. */
export const isClearKey = (key) => key === 'c' || key === 'C';

/**
 * The next half inch in the direction `dir` (+1 or -1), clamped to the accepted range. An empty field
 * (`current` null) starts from `start`, so + gives start + 0.5 and - gives start - 0.5.
 */
export function stepSize(current, dir, start = 24) {
  const from = current == null ? start : current;
  const halves = from / SIZE_STEP_IN;
  const next = (dir > 0 ? Math.floor(halves + EPS) + 1 : Math.ceil(halves - EPS) - 1) * SIZE_STEP_IN;
  return Math.min(SIZE_MAX_IN, Math.max(SIZE_MIN_IN, next));
}

/**
 * The size to suggest (the placeholder, and where − and + start) for a screen whose short side is `short`
 * CSS px: a phone or a tablet (a touch screen) starts near its own size, anything else at a 24" monitor.
 */
export function typicalSize({ short, coarse }) {
  return { phone: 6.1, tablet: 11 }[deviceKind({ short, coarse })] ?? 24;
}

/** 'phone' or 'tablet' for a touch screen whose short side is under 500 or 1100 CSS px, else null. */
export function deviceKind({ short, coarse }) {
  if (!coarse) return null;
  return short < 500 ? 'phone' : short < 1100 ? 'tablet' : null;
}

/**
 * Wire `input` with its − and + buttons. The buttons and the step keys (see stepDirection) write the new value and fire
 * an `input` event, so the owner's own handler runs as if it was typed. Returns `sync()`, which refreshes
 * the spinbutton's aria values; call it after setting `input.value` from code.
 */
export function sizeStepper(input, minus, plus, { start = 24 } = {}) {
  const sync = () => {
    const n = parseSize(input.value);
    if (n == null) {
      input.removeAttribute('aria-valuenow');
      input.removeAttribute('aria-valuetext');
    } else {
      input.setAttribute('aria-valuenow', String(n));
      input.setAttribute('aria-valuetext', `${n} inches`);
    }
  };
  const step = (dir) => {
    input.value = String(stepSize(parseSize(input.value), dir, start));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  input.setAttribute('aria-valuemin', String(SIZE_MIN_IN));
  input.setAttribute('aria-valuemax', String(SIZE_MAX_IN));
  // Typing, pasting and dictation all end up here: letters never stay in the field. This listener is
  // added first, so the owner's own `input` handler already sees the cleaned value.
  input.addEventListener('input', () => {
    const clean = cleanSizeText(input.value);
    if (clean !== input.value) {
      const caret = input.selectionStart ?? clean.length;
      const removed = input.value.length - clean.length;
      input.value = clean;
      input.setSelectionRange(Math.max(0, caret - removed), Math.max(0, caret - removed));
    }
    sync();
  });
  input.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave shortcuts such as Ctrl+- (zoom) and Ctrl+C (copy) alone
    if (isClearKey(e.key)) {
      e.preventDefault();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    const dir = stepDirection(e.key);
    if (!dir) return;
    e.preventDefault();
    step(dir);
  });
  minus.addEventListener('click', () => { step(-1); input.focus(); });
  plus.addEventListener('click', () => { step(1); input.focus(); });
  sync();
  return sync;
}
