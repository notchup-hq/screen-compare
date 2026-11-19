// Your screen's physical size and scale, from whatever the visitor can tell us. Pure maths,
// no DOM. Precedence, in one place: a card measurement beats a typed size, which beats a model.
//
// The browser knows the resolution and devicePixelRatio but never the physical size, so we need
// the diagonal: typed, taken from a model, or measured with a bank card.
//
//   ppi            = hypot(native px width, native px height) / diagonal (in)
//   CSS px per cm  = ppi / devicePixelRatio / 2.54

import { MM_PER_INCH, pxPerMm, sizeFromDiagonal } from './geometry.js';

/** Aspect ratios (long / short) a real panel can have; anything else is not a usable resolution. */
const MIN_RATIO = 1;
const MAX_RATIO = 4;

export const SIZE_MIN_IN = 10;
export const SIZE_MAX_IN = 100;

/** CSS pixels per mm when 1 CSS px is 1/96 inch: what we assume when nothing is known yet. */
export const DEFAULT_PX_PER_MM = 96 / MM_PER_INCH;

/** True for a size in inches the page accepts. */
export const validSize = (n) => Number.isFinite(n) && n >= SIZE_MIN_IN && n <= SIZE_MAX_IN;

/** Is w x h (any orientation) a believable panel resolution? */
export function usableResolution(w, h) {
  if (!(w > 0 && h > 0)) return false;
  const r = Math.max(w, h) / Math.min(w, h);
  return r >= MIN_RATIO && r <= MAX_RATIO;
}

/** CSS px per cm from the panel's native pixels, its diagonal (in) and the device pixel ratio. */
export function cssPxPerCm({ diagonalIn, resX, resY, dpr }) {
  return Math.hypot(resX, resY) / diagonalIn / dpr / 2.54;
}

/** A number rounded to one decimal: the way sizes in inches are shown. */
export const round1 = (n) => Math.round(n * 10) / 10;

/**
 * @param {{ preset?: object|null, sizeIn?: number|null, res?: number[]|null, ratio?: number|null,
 *           cal?: number|null, css: {width:number, height:number}, dpr: number }} input
 *   preset  a resolved screen (model or custom spec); sizeIn the typed diagonal; res an edited native
 *   resolution [w, h]; ratio the aspect ratio (w / h) to use when no resolution is usable;
 *   cal CSS px per mm measured with a card; css = window.screen width and height.
 * @returns {null | { basis: 'card'|'size'|'model', pxPerMm: number, widthMm: number, heightMm: number,
 *           diagonalIn: number, ratio: number, id: string, name: string, short: string, res?: number[] }}
 */
export function yourScreen({ preset = null, sizeIn = null, res = null, ratio = null, cal = null, css, dpr }) {
  if (cal > 0) {
    const widthMm = css.width / cal;
    const heightMm = css.height / cal;
    const diagonalIn = Math.hypot(widthMm, heightMm) / MM_PER_INCH;
    const d = round1(diagonalIn);
    return {
      basis: 'card', pxPerMm: cal, widthMm, heightMm, diagonalIn,
      ratio: widthMm / heightMm, id: 'card', name: `Your screen, about ${d}"`, short: `Your ${d}" screen`,
    };
  }

  if (validSize(sizeIn)) {
    const edited = res && usableResolution(res[0], res[1]) ? res : null;
    const native = css.width > 0 && css.height > 0 ? [Math.round(css.width * dpr), Math.round(css.height * dpr)] : null;
    const label = `${sizeIn}"`;
    const base = { basis: 'size', id: `size-${sizeIn}`, name: `${label} screen`, short: `${label} screen`, diagonalIn: sizeIn, custom: true };
    if (edited) {
      // An edited resolution is native pixels, so the device pixel ratio matters here.
      const [long, short] = edited[0] >= edited[1] ? edited : [edited[1], edited[0]];
      const r = long / short;
      return { ...base, ...sizeFromDiagonal(sizeIn, r), ratio: r, res: [long, short], pxPerMm: Math.hypot(long, short) / dpr / (sizeIn * MM_PER_INCH) };
    }
    if (native && usableResolution(css.width, css.height)) {
      // CSS size x dpr is the native size, so dpr cancels: the CSS diagonal over the real diagonal.
      const long = Math.max(css.width, css.height);
      const short = Math.min(css.width, css.height);
      const r = long / short;
      const [nl, ns] = native[0] >= native[1] ? native : [native[1], native[0]];
      return { ...base, ...sizeFromDiagonal(sizeIn, r), ratio: r, res: [nl, ns], pxPerMm: Math.hypot(long, short) / (sizeIn * MM_PER_INCH) };
    }
    // No usable resolution: the aspect ratio has to come from the visitor.
    if (!(ratio >= MIN_RATIO && ratio <= MAX_RATIO) || !(Math.max(css.width, css.height) > 0)) return null;
    const dims = sizeFromDiagonal(sizeIn, ratio);
    return { ...base, ...dims, ratio, pxPerMm: pxPerMm(Math.max(css.width, css.height), dims.widthMm) };
  }

  if (preset) return { ...preset, basis: 'model', pxPerMm: pxPerMm(css.width, preset.widthMm) };
  return null;
}
