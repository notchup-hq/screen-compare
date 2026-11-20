// Pure maths, no DOM. All lengths in mm unless stated.

export const MM_PER_INCH = 25.4;

/** Physical width/height of a panel from its diagonal (inches) and aspect ratio (w / h). */
export function sizeFromDiagonal(diagonalIn, ratio) {
  const widthMm = (diagonalIn * ratio) / Math.sqrt(ratio * ratio + 1) * MM_PER_INCH;
  return { widthMm, heightMm: widthMm / ratio };
}

/** CSS px per mm on the current screen, from its CSS width in px and physical width in mm. */
export function pxPerMm(screenWidthPx, widthMm) {
  return screenWidthPx / widthMm;
}

/** Area of `target` as a fraction of `base` (1 = same area). */
export function areaRatio(target, base) {
  return (target.widthMm * target.heightMm) / (base.widthMm * base.heightMm);
}

/** True when the target fits entirely inside the current screen. */
export function fitsInside(target, current) {
  return target.widthMm <= current.widthMm && target.heightMm <= current.heightMm;
}

/**
 * How far the target reaches past the current screen, per side (mm).
 * Positive = target is larger on that axis, negative = smaller.
 */
export function overflowPerSide(target, current) {
  return {
    sideMm: (target.widthMm - current.widthMm) / 2,
    topMm: (target.heightMm - current.heightMm) / 2,
  };
}

/** True when a w x h box fits in a boxW x boxH area with `margin` px kept free on every side. */
export function fitsBox(w, h, boxW, boxH, margin = 0) {
  return w + margin * 2 <= boxW && h + margin * 2 <= boxH;
}
