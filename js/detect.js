// Guess which laptop model is the current screen from its native pixel size.
// Pure maths, no DOM. It is only ever a suggestion: scaling, browser zoom and
// external monitors change what the browser reports. Only laptop models with a
// spec source are candidates: generic sizes and monitors are never guessed.

import { SCREENS } from './screens.js';

// Fractional pixel ratios (1.25, 1.5, 1.75) make css px x ratio land a pixel or
// two off the panel's real resolution.
const TOLERANCE_PX = 2;

/** The presets a screen can be recognised as: real laptop models. */
export const DETECTABLE = SCREENS.filter((s) => s.kind === 'laptop' && s.source);

/** Native resolution as [long side, short side], so portrait and landscape agree. */
export function nativeResolution(cssWidth, cssHeight, pixelRatio = 1) {
  const w = Math.round(cssWidth * pixelRatio);
  const h = Math.round(cssHeight * pixelRatio);
  return w >= h ? [w, h] : [h, w];
}

/** Presets whose panel resolution matches the browser's screen. */
export function matchScreens(cssWidth, cssHeight, pixelRatio = 1, screens = DETECTABLE) {
  const native = nativeResolution(cssWidth, cssHeight, pixelRatio);
  const matches = screens
    .filter((s) => Math.abs(s.resX - native[0]) <= TOLERANCE_PX && Math.abs(s.resY - native[1]) <= TOLERANCE_PX)
    .map((s) => s.id);
  return { native, matches };
}
