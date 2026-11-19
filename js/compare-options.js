// Pure helpers for the setup dialog and the Details drawer: how presets are grouped in the lists, the
// four sizes offered in the second question, and how a generic laptop size maps to a screen spec in
// another aspect ratio. No DOM, so tests can import it.

import { SCREENS, RATIOS } from './screens.js';
import { resolveScreen, customSpec } from './state.js';
import { round1, validSize } from './scale.js';
import { parseSize } from './size-field.js';

/** Order of the headings in the screen lists. */
export const GROUPS = ['Apple', 'Framework', 'Microsoft', 'Generic laptops', 'Monitors', 'Tablets', 'Phones'];

/** Aspect ratios Details offers for a generic laptop size you compare with. */
export const RATIO_CHOICES = RATIOS.filter((r) => ['16x10', '16x9', '3x2'].includes(r.id));

/** Aspect ratios Details offers for a typed size of your own screen, only when the resolution is unusable. */
export const SIZE_RATIO_CHOICES = ['16x9', '16x10', '3x2', '21x9'].map((id) => RATIOS.find((r) => r.id === id));

/** Under this size a screen counts as a phone; a monitor from MONITOR_FROM_IN up. */
const PHONE_UNDER_IN = 7.5;
const MONITOR_FROM_IN = 19;
/** A touch screen under this size is a tablet, not a laptop (no laptop is used by touch alone). */
const TABLET_UNDER_IN = 14;

/**
 * The kind of your own screen, from its diagonal in inches and whether its main pointer is touch:
 * 'phone', 'tablet', 'laptop' or 'monitor'. An unknown size counts as a laptop.
 */
export function kindOfYours(inches, { touch = false } = {}) {
  if (!(inches > 0)) return 'laptop';
  if (inches < PHONE_UNDER_IN) return 'phone';
  if (touch && inches < TABLET_UNDER_IN) return 'tablet';
  return inches >= MONITOR_FROM_IN ? 'monitor' : 'laptop';
}

/** The kinds in the order "Show all sizes" lists them, after the visitor's own kind. */
export const KINDS = [
  { kind: 'phone', label: 'Phones' },
  { kind: 'tablet', label: 'Tablets' },
  { kind: 'laptop', label: 'Laptops' },
  { kind: 'monitor', label: 'Monitors' },
];

/** The kinds for the second question: your own first, then the rest only when all are shown. */
export function kindsToShow(kind, all) {
  return all ? [kind, ...KINDS.map((k) => k.kind).filter((k) => k !== kind)] : [kind];
}

/** The four buttons of the second question, by the kind of your own screen. Each is a generic preset. */
export const STEP2_SIZES = {
  phone: [
    { preset: 'p54', label: '5.4"', name: '5.4 inch phone' },
    { preset: 'p61', label: '6.1"', name: '6.1 inch phone' },
    { preset: 'p65', label: '6.5"', name: '6.5 inch phone' },
    { preset: 'p69', label: '6.9"', name: '6.9 inch phone' },
  ],
  tablet: [
    { preset: 't83', label: '8.3"', name: '8.3 inch tablet' },
    { preset: 't11', label: '11"', name: '11 inch tablet' },
    { preset: 't124', label: '12.4"', name: '12.4 inch tablet' },
    { preset: 't13', label: '13"', name: '13 inch tablet' },
  ],
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

/** The kind whose step-2 buttons include `spec`, or null. */
export function step2KindOf(spec) {
  return Object.keys(STEP2_SIZES).find((k) => STEP2_SIZES[k].some((p) => p.preset === spec)) ?? null;
}

/** The ratio a typed "Other size" gets, by the kind of your screen. 20:9 and 4:3 are only used for handhelds. */
const OTHER_RATIO = { phone: '20x9', tablet: '4x3', laptop: '16x10', monitor: '16x9' };
const HANDHELD_RATIOS = ['20x9', '4x3'];

/** Phones and tablets are held either way up; laptops and monitors never stand on their side. */
export function handheld(screen) {
  return screen.custom ? HANDHELD_RATIOS.includes(screen.ratioId) : screen.kind === 'phone' || screen.kind === 'tablet';
}

/**
 * A resolved screen turned the way you hold your own (`upright`: taller than wide), when it is a
 * phone or tablet. Laptops and monitors are returned as they are.
 */
export function facing(screen, upright) {
  if (!screen || !handheld(screen) || (screen.heightMm > screen.widthMm) === upright) return screen;
  const looks = screen.looksLike && [screen.looksLike[1], screen.looksLike[0]];
  return { ...screen, widthMm: screen.heightMm, heightMm: screen.widthMm, ratio: 1 / screen.ratio, looksLike: looks };
}

/**
 * The screen spec for a size typed under "Other size": a generic preset when one has that size and the
 * usual ratio of the kind (OTHER_RATIO), else a custom size. Null for an invalid size.
 */
export function otherSizeSpec(inches, kind) {
  if (!validSize(inches)) return null;
  const ratioId = OTHER_RATIO[kind] ?? OTHER_RATIO.laptop;
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
