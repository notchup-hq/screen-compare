// Pure helpers for the setup dialog and the Details drawer: how presets are grouped in the lists, the
// four sizes offered in the second question, and how size pills map to screen specs. No DOM, so
// tests can import it.

import { SCREENS, RATIOS } from './screens.js';
import { resolveScreen, customSpec } from './state.js';
import { validSize } from './scale.js';
import { parseSize } from './size-field.js';

/** Order of the headings in the screen lists. */
export const GROUPS = ['Apple', 'Framework', 'Microsoft', 'Generic laptops', 'Monitors'];

/** Aspect ratios offered for generic laptop sizes in "Compare with". */
export const RATIO_CHOICES = RATIOS.filter((r) => ['16x10', '16x9', '3x2'].includes(r.id));

/** Ratio chips for a typed "Your screen" size, shown only when the resolution is unusable. */
export const SIZE_RATIO_CHOICES = ['16x9', '16x10', '3x2', '21x9'].map((id) => RATIOS.find((r) => r.id === id));

/** A screen this size or bigger counts as a monitor; smaller ones as a laptop. */
const MONITOR_FROM_IN = 19;

/** 'laptop' or 'monitor', from the diagonal in inches (unknown counts as a laptop). */
export function kindForDiagonal(inches) {
  return inches >= MONITOR_FROM_IN ? 'monitor' : 'laptop';
}

/** The four buttons of the second question, by the kind of your own screen. Each is a generic preset. */
export const STEP2_SIZES = {
  laptop: [
    { preset: 'g133', label: '13"', name: '13 inch laptop' },
    { preset: 'g14', label: '14"', name: '14 inch laptop' },
    { preset: 'g156', label: '15"', name: '15 inch laptop' },
    { preset: 'g16', label: '16"', name: '16 inch laptop' },
  ],
  monitor: [
    { preset: 'm24', label: '24"', name: '24 inch monitor' },
    { preset: 'm27', label: '27"', name: '27 inch monitor' },
    { preset: 'm32', label: '32"', name: '32 inch monitor' },
    { preset: 'm34', label: '34" wide', name: '34 inch wide monitor' },
  ],
};

/**
 * The screen spec for a size typed under "Other size": a generic preset when one has that size and the
 * usual ratio of the kind (16:10 laptops, 16:9 monitors), else a custom size. Null for an invalid size.
 */
export function otherSizeSpec(inches, kind) {
  if (!validSize(inches)) return null;
  const ratioId = kind === 'monitor' ? '16x9' : '16x10';
  const ratio = RATIOS.find((r) => r.id === ratioId).value;
  const d = Math.round(inches * 10) / 10;
  const preset = SCREENS.find((s) => !s.source && s.kind === kind && s.diagonalIn === d && Math.abs(s.resX / s.resY - ratio) < 0.01);
  return preset ? preset.id : customSpec(d, ratioId);
}

/**
 * "Other size" and "a specific model" are two alternatives: the one changed last is used. `active` is
 * 'size', 'model' or null (nothing changed yet); `sizeText` is what is in the size field and `modelId`
 * the chosen model ('' for none). An active control with no value hands over to the other one.
 * Returns which one is used (`use`: 'size', 'model' or null), the screen spec to show (null while the
 * size is out of range) and the label of the Show button ("Show 22"", "Show MacBook Pro 14"").
 * `keep` ({ size, spec }) keeps a custom spec the visitor came in with while its size is untouched.
 */
export function otherChoice({ active = null, sizeText = '', modelId = '', kind, keep = null }) {
  const hasSize = String(sizeText).trim() !== '';
  const hasModel = Boolean(modelId);
  let use = null;
  if (active === 'size' && hasSize) use = 'size';
  else if (active === 'model' && hasModel) use = 'model';
  else if (hasSize) use = 'size';
  else if (hasModel) use = 'model';
  if (use === 'model') {
    const s = resolveScreen(modelId);
    return s ? { use, spec: modelId, label: `Show ${s.short ?? s.name}` } : { use: null, spec: null, label: 'Show' };
  }
  if (use === 'size') {
    const n = parseSize(sizeText);
    if (!validSize(n)) return { use, spec: null, label: 'Show' };
    const spec = keep && n === keep.size ? keep.spec : otherSizeSpec(n, kind);
    return { use, spec, label: `Show ${Math.round(n * 10) / 10}"` };
  }
  return { use: null, spec: null, label: 'Show' };
}

/** The common sizes shown as pills. Each is a generic preset ("typical panel"). */
export const SIZE_PILLS = [
  { id: '13', label: '13"', preset: 'g133' },
  { id: '14', label: '14"', preset: 'g14' },
  { id: '15', label: '15"', preset: 'g156' },
  { id: '16', label: '16"', preset: 'g16' },
];

/** Monitor sizes in "Compare with" (generic presets, no ratio row: the ratio is part of the pill). */
export const MONITOR_PILLS = [
  { id: 'm215', label: '21.5"', preset: 'm215' },
  { id: 'm24', label: '24"', preset: 'm24' },
  { id: 'm24w', label: '24" 16:10', preset: 'm24w' },
  { id: 'm27', label: '27"', preset: 'm27' },
  { id: 'm32', label: '32"', preset: 'm32' },
  { id: 'm34', label: '34" ultrawide', preset: 'm34' },
];

/** The pill that opens the model list. */
export const MODEL_PILL = 'model';

/** Presets as [{ group, screens }], in heading order. */
export function groupedScreens(screens = SCREENS) {
  return GROUPS
    .map((group) => ({ group, screens: screens.filter((s) => s.group === group) }))
    .filter((g) => g.screens.length > 0);
}

/** Laptop models with a spec source, grouped: the list behind "Pick a model…" for your own screen. */
export function laptopModels() {
  return groupedScreens(SCREENS.filter((s) => s.kind === 'laptop' && s.source));
}

function ratioIdOf(screen) {
  const value = screen.resX / screen.resY;
  return RATIOS.find((r) => Math.abs(r.value - value) < 0.01)?.id ?? null;
}

/** The ratio a size pill starts with (that of its generic preset). */
export function defaultRatio(pillId) {
  const pill = SIZE_PILLS.find((p) => p.id === pillId);
  const preset = pill && SCREENS.find((s) => s.id === pill.preset);
  return (preset && ratioIdOf(preset)) ?? RATIO_CHOICES[0].id;
}

/**
 * Which pill (and ratio) stands for a screen spec. Presets that are not one of the
 * generic pill sizes, and custom sizes that match no pill, belong to the model list.
 */
export function pillFor(spec) {
  const screen = resolveScreen(spec);
  if (!screen) return { pill: null, ratioId: null };
  const monitor = MONITOR_PILLS.find((p) => p.preset === spec);
  if (monitor) return { pill: monitor.id, ratioId: null };
  const direct = SIZE_PILLS.find((p) => p.preset === spec);
  if (direct) return { pill: direct.id, ratioId: defaultRatio(direct.id) };
  if (screen.custom) {
    const byDiagonal = SIZE_PILLS.find((p) => SCREENS.find((s) => s.id === p.preset)?.diagonalIn === screen.diagonalIn);
    if (byDiagonal && RATIO_CHOICES.some((r) => r.id === screen.ratioId)) return { pill: byDiagonal.id, ratioId: screen.ratioId };
  }
  return { pill: MODEL_PILL, ratioId: null };
}

/** The screen spec for a pill, a ratio and (for the model pill) a model id; null if incomplete. */
export function specFor(pillId, ratioId, modelId) {
  if (pillId === MODEL_PILL) return resolveScreen(modelId) ? modelId : null;
  const monitor = MONITOR_PILLS.find((p) => p.id === pillId);
  if (monitor) return monitor.preset;
  const pill = SIZE_PILLS.find((p) => p.id === pillId);
  const preset = pill && SCREENS.find((s) => s.id === pill.preset);
  if (!preset) return null;
  if (!ratioId || ratioId === defaultRatio(pillId)) return preset.id;
  return customSpec(preset.diagonalIn, ratioId);
}
