// Pure helpers for the setup dialog: how presets are grouped in the lists, and how
// the "Compare with" size pills map to screen specs. No DOM, so tests can import it.

import { SCREENS, RATIOS } from './screens.js';
import { resolveScreen, customSpec } from './state.js';

/** Order of the headings in the screen lists. */
export const GROUPS = ['Apple', 'Framework', 'Microsoft', 'Generic sizes'];

/** Aspect ratios offered for generic and custom sizes. */
export const RATIO_CHOICES = RATIOS.filter((r) => ['16x10', '16x9', '3x2'].includes(r.id));

/** The common sizes shown as pills. Each is a generic preset ("typical panel"). */
export const SIZE_PILLS = [
  { id: '13', label: '13"', preset: 'g133' },
  { id: '14', label: '14"', preset: 'g14' },
  { id: '15', label: '15"', preset: 'g156' },
  { id: '16', label: '16"', preset: 'g16' },
];

/** The pill that opens the model list. */
export const MODEL_PILL = 'model';

/** Presets as [{ group, screens }], in heading order. */
export function groupedScreens(screens = SCREENS) {
  return GROUPS
    .map((group) => ({ group, screens: screens.filter((s) => s.group === group) }))
    .filter((g) => g.screens.length > 0);
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
  const pill = SIZE_PILLS.find((p) => p.id === pillId);
  const preset = pill && SCREENS.find((s) => s.id === pill.preset);
  if (!preset) return null;
  if (!ratioId || ratioId === defaultRatio(pillId)) return preset.id;
  return customSpec(preset.diagonalIn, ratioId);
}
