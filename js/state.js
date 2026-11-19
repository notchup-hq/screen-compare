// URL query <-> state. This module never touches browser storage (only js/memory.js does).
// ?size=21.5&to=mbp14&cal=3.84&fill=1  (sample content is off unless fill=1)
//
// Your screen is one of, strongest first: cal (CSS px per mm, from the bank card), size (the typed
// diagonal in inches, with res=1920x1080 only when the resolution was edited, or ratio=16x9 only
// when there is no usable resolution), or from (a laptop model id).
// Compared screen: to=<preset id>, or a custom size c-<diagonal>-<ratio id>, e.g. c-16.0-16x10.

import { SCREENS, RATIOS } from './screens.js';
import { sizeFromDiagonal } from './geometry.js';
import { usableResolution, validSize } from './scale.js';

const RES = /^(\d{3,5})x(\d{3,5})$/;
const CUSTOM = /^c-(\d{1,3}(?:\.\d)?)-(\w+)$/;

/** Turn a spec string into a screen object, or null if invalid. */
export function resolveScreen(spec) {
  const preset = SCREENS.find((s) => s.id === spec);
  if (preset) {
    const ratio = preset.resX / preset.resY;
    return { ...preset, ratio, ...sizeFromDiagonal(preset.diagonalIn, ratio) };
  }
  const m = CUSTOM.exec(spec ?? '');
  const r = m && RATIOS.find((x) => x.id === m[2]);
  const d = m && Number(m[1]);
  if (!r || !validSize(d)) return null;
  return {
    id: spec,
    name: `${d}" ${r.label}`,
    diagonalIn: d,
    ratio: r.value,
    looksLike: null,
    custom: true,
    ratioId: r.id,
    ...sizeFromDiagonal(d, r.value),
  };
}

export function customSpec(diagonalIn, ratioId) {
  return `c-${Number(diagonalIn).toFixed(1)}-${ratioId}`;
}

/** Parse a query string into state, falling back to defaults for anything invalid. */
export function parseState(search, defaults) {
  const p = new URLSearchParams(search);
  let from = resolveScreen(p.get('from')) ? p.get('from') : defaults.from;
  const to = resolveScreen(p.get('to')) ? p.get('to') : defaults.to;
  const cal = Number(p.get('cal'));
  let size = Number(p.get('size'));
  size = validSize(size) ? size : null;
  let ratio = RATIOS.some((r) => r.id === p.get('ratio')) ? p.get('ratio') : null;

  // An older link names a typed size as from=c-16.0-16x10: read it as a size.
  const named = resolveScreen(from);
  if (named?.custom) {
    if (size === null) { size = named.diagonalIn; ratio = named.ratioId; }
    from = defaults.from;
  }

  const m = size === null ? null : RES.exec(p.get('res') ?? '');
  const res = m && usableResolution(Number(m[1]), Number(m[2])) ? [Number(m[1]), Number(m[2])] : null;
  return {
    from,
    size,
    res,
    ratio: size !== null && !res ? ratio : null,
    to,
    cal: cal > 0.5 && cal < 20 ? cal : null,
    fill: p.get('fill') === '1',
  };
}

export function serializeState(state) {
  const p = new URLSearchParams();
  if (state.size) {
    p.set('size', String(state.size));
    if (state.res) p.set('res', `${state.res[0]}x${state.res[1]}`);
    else if (state.ratio) p.set('ratio', state.ratio);
  } else if (state.from) {
    p.set('from', state.from);
  }
  p.set('to', state.to);
  if (state.cal) p.set('cal', state.cal.toFixed(3));
  if (state.fill) p.set('fill', '1');
  return `?${p}`;
}

/** The page address with the comparison removed: what "Start over" puts in the address bar. */
export function startOverUrl(pathname, hash = '') {
  return `${pathname}${hash}`;
}
