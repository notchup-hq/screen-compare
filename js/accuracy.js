// How trustworthy is the real-size outline? Pure maths, no DOM. Best effort: it only
// raises a warning when the evidence is fairly clear, so an exact match never gets one.

import { matchScreens, nativeResolution } from './detect.js';

export const ACCURACY_TEXT = {
  calibrated: 'Real size · calibrated with a card ✓',
  assumed: 'Real size · based on your screen choice',
  zoom: "Approximate: browser zoom isn't 100 %",
  mismatch: "Approximate: this doesn't look like the screen you picked",
};

const RATIO_TOLERANCE = 0.05 // Apple panels are 1.55:1, a custom "16:10" is 1.6:1;
// Outer/inner window width is 1 at 100 % zoom; scrollbars and borders add a little.
const ZOOM_LOW = 0.95;
const ZOOM_HIGH = 1.1;

/**
 * @param {{cal: number|null, screen: {width:number, height:number, dpr:number},
 *          win: {outerWidth:number, innerWidth:number},
 *          chosen: {id:string, widthMm:number, heightMm:number, custom?:boolean}}} input
 * @returns {'calibrated'|'zoom'|'mismatch'|'assumed'}
 */
export function accuracy({ cal, screen, win, chosen }) {
  if (cal) return 'calibrated';

  const { outerWidth, innerWidth } = win;
  if (outerWidth > 0 && innerWidth > 0) {
    const r = outerWidth / innerWidth;
    if (r < ZOOM_LOW || r > ZOOM_HIGH) return 'zoom';
  }

  const [long, short] = nativeResolution(screen.width, screen.height, screen.dpr);
  const seen = long / short;
  const want = Math.max(chosen.widthMm, chosen.heightMm) / Math.min(chosen.widthMm, chosen.heightMm);
  if (Math.abs(seen - want) / want > RATIO_TOLERANCE) return 'mismatch';

  if (!chosen.custom) {
    const { matches } = matchScreens(screen.width, screen.height, screen.dpr);
    if (matches.length && !matches.includes(chosen.id)) return 'mismatch';
  }
  return 'assumed';
}
