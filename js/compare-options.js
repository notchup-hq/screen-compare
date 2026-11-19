// Pure helpers for the setup dialog and the Details drawer: how presets are grouped in the lists, the
// four sizes offered in the second question, and how a generic laptop size maps to a screen spec in
// another aspect ratio. No DOM, so tests can import it.

import { SCREENS, RATIOS } from './screens.js';
import { resolveScreen, customSpec } from './state.js';
import { round1, validSize } from './scale.js';
import { parseSize } from './size-field.js';

/** Order of the headings in the screen lists. */
export const GROUPS = ['Apple', 'Framework', 'Microsoft', 'Generic laptops', 'Monitors'];

/** Aspect ratios Details offers for a generic laptop size you compare with. */
export const RATIO_CHOICES = RATIOS.filter((r) => ['16x10', '16x9', '3x2'].includes(r.id));

/** Aspect ratios Details offers for a typed size of your own screen, only when the resolution is unusable. */
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
  const d = round1(inches);
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
    return { use, spec, label: `Show ${round1(n)}"` };
  }
  return { use: null, spec: null, label: 'Show' };
}

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

/** The four generic laptop sizes: the buttons of the second question, and the sizes whose ratio Details can change. */
export const LAPTOP_SIZES = STEP2_SIZES.laptop;

const presetOf = (id) => SCREENS.find((s) => s.id === id);

/** The aspect ratio id a generic preset starts with (that of its panel). */
function defaultRatioId(presetId) {
  const s = presetOf(presetId);
  const value = s.resX / s.resY;
  return RATIOS.find((r) => Math.abs(r.value - value) < 0.01)?.id ?? RATIO_CHOICES[0].id;
}

/**
 * Which generic laptop size (and ratio) a screen spec stands for: a preset of that size, or a custom
 * size of the same diagonal in one of the offered ratios. Null for anything else (models, monitors,
 * other sizes), which have no ratio to change.
 */
export function laptopSizeFor(spec) {
  const screen = resolveScreen(spec);
  if (!screen) return null;
  const direct = LAPTOP_SIZES.find((p) => p.preset === spec);
  if (direct) return { preset: direct.preset, ratioId: defaultRatioId(direct.preset) };
  if (!screen.custom || !RATIO_CHOICES.some((r) => r.id === screen.ratioId)) return null;
  const sameSize = LAPTOP_SIZES.find((p) => presetOf(p.preset).diagonalIn === screen.diagonalIn);
  return sameSize ? { preset: sameSize.preset, ratioId: screen.ratioId } : null;
}

/** The screen spec for a generic laptop size in a ratio: the preset itself in its own ratio, else a custom size. Null if not one of the four. */
export function laptopSpec(presetId, ratioId) {
  if (!LAPTOP_SIZES.some((p) => p.preset === presetId)) return null;
  if (!ratioId || ratioId === defaultRatioId(presetId)) return presetId;
  return customSpec(presetOf(presetId).diagonalIn, ratioId);
}
