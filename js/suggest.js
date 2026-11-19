// Pure helpers: which smaller screen to start the comparison with, and what to call a screen by its size.

import { SCREENS } from './screens.js';
import { LAPTOP_SIZES } from './compare-options.js';

// "Next size down" for a laptop model. Screens with no smaller preset (13" and
// under, custom sizes, unknown) fall back to the 14" MacBook Pro.
const SMALLER = {
  mbp16: 'mbp14',
  mbp14: 'mba13',
  mba15: 'mba13',
  sl15: 'sl138',
  sl138: 'sl13',
  g16: 'g14',
  g173: 'g156',
  g156: 'g14',
  g14: 'g133',
};

const FALLBACK = 'mbp14';

/** Preset id of a common smaller screen to compare with `fromId` (a spec string or null). */
export function smallerThan(fromId) {
  const id = SMALLER[fromId];
  return SCREENS.some((s) => s.id === id) ? id : FALLBACK;
}

/**
 * Preset id of a smaller laptop to compare with a typed size: the biggest generic laptop size that
 * is clearly smaller (at most 92 % of the diagonal). Monitors and anything with no such size get the
 * common 14" MacBook Pro.
 */
export function smallerThanSize(sizeIn) {
  if (!(sizeIn <= 18)) return FALLBACK;
  const smaller = LAPTOP_SIZES.filter((p) => SCREENS.find((s) => s.id === p.preset).diagonalIn <= sizeIn * 0.92).at(-1);
  return smaller ? smaller.preset : FALLBACK;
}

/** Size in inches as people say it: from the short name, else the custom diagonal. */
export function sizeLabel(screen) {
  if (screen.custom) return `${screen.diagonalIn}"`;
  const m = /(\d+(?:\.\d+)?)"/.exec(screen.short ?? '');
  return m ? `${m[1]}"` : `${Math.round(screen.diagonalIn)}"`;
}
