// The size fields (your screen, and "Other size"): a plain text field with our own − and + buttons.
// Pure helpers first (unit tested), then the small DOM wiring. The placeholder is only a hint: an
// empty field never counts as a value, but stepping from empty starts at the placeholder's number.

import { SIZE_MAX_IN, SIZE_MIN_IN } from './scale.js';

export const SIZE_STEP_IN = 0.5;
const EPS = 1e-9;

/** A number from what was typed: "15,6" and "15.6" both work. Null when it is not a number. Range is not checked. */
export function parseSize(text) {
  const t = String(text ?? '').trim();
  if (!/^(\d+[.,]?\d*|[.,]\d+)$/.test(t)) return null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

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
 * Wire `input` with its − and + buttons. The buttons and ArrowUp/ArrowDown write the new value and fire
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
  input.addEventListener('input', sync);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      step(e.key === 'ArrowUp' ? 1 : -1);
    }
  });
  minus.addEventListener('click', () => { step(-1); input.focus(); });
  plus.addEventListener('click', () => { step(1); input.focus(); });
  sync();
  return sync;
}
