// The technical settings, kept out of the setup dialog: the resolution the display is set to and the
// aspect ratios. The controls are built once and sync() only sets values and visibility, so a field
// never loses focus while someone types in it. The page owns the state: a change goes to
// onChange({ res | ratio | to }); see initDetails.

import { RATIO_CHOICES, SIZE_RATIO_CHOICES, laptopSizeFor, laptopSpec } from './compare-options.js';
import { usableResolution } from './scale.js';

function ratioChoice(name, value, label) {
  const l = document.createElement('label');
  l.className = 'ratio-choice';
  const input = document.createElement('input');
  input.type = 'radio';
  input.name = name;
  input.value = value;
  const span = document.createElement('span');
  span.textContent = label;
  l.append(input, span);
  return l;
}

/**
 * @param {HTMLElement} root the drawer, with the markup of #adjust and #remembered in it
 * @param {object} handlers what the page does with a change; the controls themselves hold no state
 * @param {(patch: { res?: number[]|null, ratio?: string, to?: string|null }) => void} handlers.onChange
 *   one field changed: your edited resolution (null = back to the detected one), the assumed ratio of
 *   your screen, or the spec of the compared screen in another ratio
 * @param {(sig: object, name: string) => void} handlers.onRename a remembered screen was renamed
 * @param {(sig: object) => void} handlers.onDelete a remembered screen was deleted
 * @param {() => void} handlers.onClear "Forget all" was pressed
 * @returns {{ sync: Function, syncRemembered: Function }} sync() for the resolution and ratios,
 *   syncRemembered() for the list of remembered screens; both only set values and visibility
 */
export function initDetails(root, { onChange, onRename, onDelete, onClear }) {
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

  for (const r of SIZE_RATIO_CHOICES) ratioSet.append(ratioChoice('adj-ratio', r.id, r.label));
  for (const r of RATIO_CHOICES) toRatioSet.append(ratioChoice('adj-to-ratio', r.id, r.label));
  const check = (name, value) => {
    for (const i of root.querySelectorAll(`input[name="${name}"]`)) i.checked = i.value === value;
  };

  let toPreset = null; // the generic laptop size of the compared screen, when it is one

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
  toRatioSet.addEventListener('change', (e) => onChange({ to: laptopSpec(toPreset, e.target.value) }));

  // Remembered screens: one row per profile. The rows are rebuilt only when the list changes, so a
  // name being typed is never replaced under the cursor.
  const memSection = $('#remembered');
  const memList = $('#remembered-list');
  const memEmpty = $('#remembered-empty');
  const memClear = $('#remembered-clear');
  let memKey = '';

  function memRow(p, i, isThis) {
    const li = document.createElement('li');
    li.className = 'remembered-row';
    const id = `remembered-name-${i}`;
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = 'Name';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.maxLength = 40; // the same limit as NAME_MAX in js/memory.js, which cleans the name again
    input.value = p.name;
    input.setAttribute('aria-label', `Name of remembered screen ${i + 1}`);
    input.autocomplete = 'off';
    input.addEventListener('change', () => {
      if (input.value.trim()) onRename(p.sig, input.value);
      else input.value = p.name; // a name can't be empty
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = 'Delete';
    del.setAttribute('aria-label', `Delete ${p.name}`);
    del.addEventListener('click', () => {
      // Keep keyboard focus in the list: the next row, else the one before, else "Forget all".
      const rows = [...memList.children];
      const at = rows.indexOf(li);
      const target = rows[at + 1] ? at : at - 1; // the rows are rebuilt, so count from the top
      onDelete(p.sig);
      const el = target >= 0 ? document.getElementById(`remembered-name-${target}`) : null;
      (el ?? root.querySelector('#drawer-close'))?.focus();
    });
    li.append(label, input);
    if (isThis) {
      const here = document.createElement('span');
      here.className = 'here';
      here.textContent = 'This screen';
      li.append(here);
    }
    li.append(del);
    return li;
  }
  memClear.addEventListener('click', () => { onClear(); $('#remembered-status').focus(); });

  return {
    /** `available`: storage works at all; `profiles`: newest first; `currentSig`: the screen in use. */
    syncRemembered({ available, profiles, currentSig }) {
      memSection.hidden = !available;
      if (!available) return;
      const same = (a, b) => a.w === b.w && a.h === b.h && Math.abs(a.dpr - b.dpr) <= 0.01;
      const key = JSON.stringify([profiles.map((p) => [p.sig, p.name]), currentSig]);
      memEmpty.hidden = profiles.length > 0;
      memClear.hidden = profiles.length === 0;
      if (key === memKey) return;
      memKey = key;
      const focusedId = memList.contains(document.activeElement) ? document.activeElement.id : null;
      memList.replaceChildren(...profiles.map((p, i) => memRow(p, i, same(p.sig, currentSig))));
      if (focusedId) document.getElementById(focusedId)?.focus();
    },
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

      const laptop = laptopSizeFor(to);
      toPreset = laptop?.preset ?? null;
      toRatioSet.hidden = !laptop;
      check('adj-to-ratio', laptop?.ratioId ?? null);

      section.hidden = resRow.hidden && ratioSet.hidden && toRatioSet.hidden;
    },
  };
}
