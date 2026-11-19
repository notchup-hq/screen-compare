// The technical settings, kept out of the setup dialog: the resolution the display is set to and the
// aspect ratios. The controls are built once and sync() only sets values and visibility, so a field
// never loses focus while someone types in it. The page owns the state: a change goes to
// onChange({ res | ratio | to }).

import { RATIO_CHOICES, SIZE_PILLS, SIZE_RATIO_CHOICES, pillFor, specFor } from './compare-options.js';
import { usableResolution } from './scale.js';

function radioChip(name, value, label) {
  const l = document.createElement('label');
  l.className = 'pill';
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  const span = document.createElement('span');
  span.textContent = label;
  l.append(input, span);
  return l;
}

/** @param {HTMLElement} root the drawer, with the markup of #adjust in it */
export function initDetails(root, { onChange }) {
  const $ = (sel) => root.querySelector(sel);
  const section = $('#adjust');
  const resRow = $('#adj-res');
  const resText = $('#res-text');
  const resEdit = $('#res-edit');
  const resFields = $('#res-fields');
  const resW = $('#res-w');
  const resH = $('#res-h');
  const ratioSet = $('#adj-ratio');
  const toRatioSet = $('#adj-to-ratio');

  for (const r of SIZE_RATIO_CHOICES) ratioSet.append(radioChip('adj-ratio', r.id, r.label));
  for (const r of RATIO_CHOICES) toRatioSet.append(radioChip('adj-to-ratio', r.id, r.label));
  const check = (name, value) => {
    for (const i of root.querySelectorAll(`input[name="${name}"]`)) i.checked = i.value === value;
  };

  let toPill = null; // the size pill of the compared screen, when it is a generic laptop

  resEdit.addEventListener('click', () => {
    const open = resFields.hidden;
    resFields.hidden = !open;
    resEdit.setAttribute('aria-expanded', String(open));
    if (open) resW.focus();
  });
  // Only a complete, believable resolution (or both fields emptied) reaches the page.
  const readRes = () => {
    if (resW.value === '' && resH.value === '') { onChange({ res: null }); return; }
    const w = resW.valueAsNumber;
    const h = resH.valueAsNumber;
    if (usableResolution(w, h) && w >= 100 && h >= 100) onChange({ res: [Math.round(w), Math.round(h)] });
  };
  resW.addEventListener('input', readRes);
  resH.addEventListener('input', readRes);
  ratioSet.addEventListener('change', (e) => onChange({ ratio: e.target.value }));
  toRatioSet.addEventListener('change', (e) => onChange({ to: specFor(toPill, e.target.value) }));

  return {
    /**
     * basis: 'card' | 'size' | 'model'; res: the resolution in use, if any; edited: the resolution typed here, as typed, or null;
     * ratio: the assumed ratio id of your screen; to: the compared screen's spec.
     */
    sync({ basis, res, edited, ratio, to }) {
      const typed = basis === 'size';
      resRow.hidden = !typed;
      if (!typed) { resFields.hidden = true; resEdit.setAttribute('aria-expanded', 'false'); }
      resText.textContent = res
        ? `Resolution: ${res[0]} × ${res[1]} pixels${edited ? '' : ' (detected)'}`
        : 'Resolution: not available';
      if (!resFields.contains(document.activeElement)) {
        resW.value = edited ? edited[0] : '';
        resH.value = edited ? edited[1] : '';
      }

      ratioSet.hidden = !(typed && !res);
      check('adj-ratio', ratio);

      const { pill, ratioId } = pillFor(to);
      toPill = SIZE_PILLS.some((p) => p.id === pill) ? pill : null;
      toRatioSet.hidden = !toPill;
      check('adj-to-ratio', ratioId);

      section.hidden = resRow.hidden && ratioSet.hidden && toRatioSet.hidden;
    },
  };
}
