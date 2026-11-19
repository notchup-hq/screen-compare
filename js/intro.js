// Pure helpers for the setup dialog and the chip: which smaller screen to suggest, and what to call it.

import { SCREENS } from './screens.js';

// "Next size down" for the setup dialog. Screens with no smaller preset (13" and
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

/** Size in inches as people say it: from the short name, else the custom diagonal. */
export function sizeLabel(screen) {
  if (screen.custom) return `${screen.diagonalIn}"`;
  const m = /(\d+(?:\.\d+)?)"/.exec(screen.short ?? '');
  return m ? `${m[1]}"` : `${Math.round(screen.diagonalIn)}"`;
}
