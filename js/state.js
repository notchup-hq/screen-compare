// URL query <-> state. No cookies, no browser storage.
// ?from=mbp16&to=mbp14&cal=3.84&fill=1
// Custom screen: c-<diagonal>-<ratio id>, e.g. c-16.0-16x10

import { SCREENS, RATIOS } from './screens.js';
import { sizeFromDiagonal } from './geometry.js';

const CUSTOM = /^c-(\d{1,2}(?:\.\d)?)-(\w+)$/;

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
  if (!r || !(d >= 5 && d <= 30)) return null;
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

/** Pick the preset whose "looks like" size matches the browser's screen, if any. */
export function guessCurrent(width, height, fallback = 'mbp16') {
  const hit = SCREENS.find((s) => s.looksLike && s.looksLike[0] === width && s.looksLike[1] === height);
  return hit ? hit.id : fallback;
}

/** Parse a query string into state, falling back to defaults for anything invalid. */
export function parseState(search, defaults) {
  const p = new URLSearchParams(search);
  const from = resolveScreen(p.get('from')) ? p.get('from') : defaults.from;
  const to = resolveScreen(p.get('to')) ? p.get('to') : defaults.to;
  const cal = Number(p.get('cal'));
  return {
    from,
    to,
    cal: cal > 0.5 && cal < 20 ? cal : null,
    fill: p.get('fill') === '1',
  };
}

export function serializeState(state) {
  const p = new URLSearchParams();
  p.set('from', state.from);
  p.set('to', state.to);
  if (state.cal) p.set('cal', state.cal.toFixed(3));
  if (state.fill) p.set('fill', '1');
  return `?${p}`;
}
