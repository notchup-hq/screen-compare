// How trustworthy is the real-size outline? Pure maths, no DOM.
//
// Where your screen's size came from decides it: a card measurement or a typed size is exact (the
// scale comes straight from CSS size / diagonal, so browser zoom cancels out). Only when the size
// comes from a laptop model can we tell that something is off, by comparing the model with the
// screen the browser reports. It raises a warning only when the evidence is fairly clear, so an
// exact match never gets one.

import { matchScreens, nativeResolution } from './detect.js';
import { screenName, t } from './i18n.js';

const RATIO_TOLERANCE = 0.05; // Apple panels are 1.55:1, a custom "16:10" is 1.6:1
// Outer/inner window width is 1 at 100 % zoom; scrollbars and borders add a little.
const ZOOM_LOW = 0.95;
const ZOOM_HIGH = 1.1;

/**
 * @param {{your: {basis: 'card'|'size'|'model', id: string, widthMm: number, heightMm: number, custom?: boolean},
 *          screen: {width:number, height:number, dpr:number},
 *          win: {outerWidth:number, innerWidth:number},
 *          detected?: boolean}} input  `detected`: the model was recognised from the screen, not picked.
 * @returns {'card'|'size'|'model'|'detected'|'zoom'|'mismatch'}
 */
export function accuracy({ your, screen, win, detected = false }) {
  if (your.basis === 'card') return 'card';
  if (your.basis === 'size') return 'size';

  const { outerWidth, innerWidth } = win;
  if (outerWidth > 0 && innerWidth > 0) {
    const r = outerWidth / innerWidth;
    if (r < ZOOM_LOW || r > ZOOM_HIGH) return 'zoom';
  }

  const [long, short] = nativeResolution(screen.width, screen.height, screen.dpr);
  const seen = long / short;
  const want = Math.max(your.widthMm, your.heightMm) / Math.min(your.widthMm, your.heightMm);
  if (Math.abs(seen - want) / want > RATIO_TOLERANCE) return 'mismatch';

  if (!your.custom) {
    const { matches } = matchScreens(screen.width, screen.height, screen.dpr);
    if (matches.length && !matches.includes(your.id)) return 'mismatch';
  }
  return detected ? 'detected' : 'model';
}

/** The label under the area chip. */
export function accuracyText(kind, your) {
  switch (kind) {
    case 'card': return t('Real size · measured with a card ✓');
    case 'size': return t('Real size · from your {size}" screen size', { size: your.diagonalIn });
    case 'model': return t('Real size · based on {name}', { name: screenName(your) });
    case 'detected': return t('Real size · based on {name} (detected)', { name: screenName(your) });
    case 'zoom': return t("Approximate: browser zoom isn't 100 %");
    case 'mismatch': return t("Approximate: this doesn't look like the screen you picked");
    default: return '';
  }
}
