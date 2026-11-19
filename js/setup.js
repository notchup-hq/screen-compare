// The setup dialog: "Your screen" (a select), "Compare with" (size pills, or a model
// select) and the apply / cancel buttons. Plain controls only; the page owns the state
// and gets the result through onApply({ from, to }).

import { resolveScreen, customSpec } from './state.js';
import { smallerThan } from './intro.js';
import { groupedScreens, RATIO_CHOICES, SIZE_PILLS, MODEL_PILL, defaultRatio, pillFor, specFor } from './compare-options.js';

const OTHER = '__other__';

// With no screen chosen yet, suggest the common 14" pill rather than a specific model.
const suggestFor = (from) => (resolveScreen(from) ? smallerThan(from) : 'g14');
const $ = (root, sel) => root.querySelector(sel);

function optionList(select, { placeholder, extra } = {}) {
  select.replaceChildren();
  if (placeholder) select.append(new Option(placeholder, '', true, true));
  if (placeholder) select.options[0].disabled = true;
  for (const { group, screens } of groupedScreens()) {
    const og = document.createElement('optgroup');
    og.label = group;
    for (const s of screens) og.append(new Option(s.name, s.id));
    select.append(og);
  }
  if (extra) select.append(new Option(extra.label, extra.value));
}

function radioPill(name, value, label) {
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

export function createSetup(dialog, { onApply }) {
  const fromSelect = $(dialog, '#from-select');
  const fromOther = $(dialog, '#from-other');
  const fromDiag = $(dialog, '#from-diag');
  const fromRatios = $(fromOther, '.pills');
  const fromNote = $(dialog, '#from-note');
  const toPills = $(dialog, '#to-pills');
  const toRatio = $(dialog, '#to-ratio');
  const toModel = $(dialog, '#to-model');
  const toSelect = $(dialog, '#to-select');
  const apply = $(dialog, '#setup-apply');

  optionList(fromSelect, { placeholder: 'Choose your laptop', extra: { label: 'Other size…', value: OTHER } });
  optionList(toSelect);
  for (const r of RATIO_CHOICES) {
    fromRatios.append(radioPill('from-ratio', r.id, r.label));
    toRatio.append(radioPill('to-ratio', r.id, r.label));
  }
  for (const p of SIZE_PILLS) toPills.append(radioPill('to-pill', p.id, p.label));
  toPills.append(radioPill('to-pill', MODEL_PILL, 'Pick a model…'));

  const checked = (name) => dialog.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
  const check = (name, value) => {
    for (const i of dialog.querySelectorAll(`input[name="${name}"]`)) i.checked = i.value === value;
  };

  let toTouched = false; // until they choose, "compare with" follows their screen

  function readFrom() {
    if (fromSelect.value === OTHER) {
      const d = Number(fromDiag.value);
      return d >= 5 && d <= 30 ? customSpec(d, checked('from-ratio') ?? RATIO_CHOICES[0].id) : null;
    }
    return fromSelect.value || null;
  }

  function readTo() {
    return specFor(checked('to-pill'), checked('to-ratio'), toSelect.value);
  }

  function showTo(spec) {
    const { pill, ratioId } = pillFor(spec);
    check('to-pill', pill);
    if (pill === MODEL_PILL) {
      // A custom size from a link that matches no pill gets its own entry in the model list.
      toSelect.querySelector('option[data-custom]')?.remove();
      if (resolveScreen(spec)?.custom) {
        const o = new Option(`${resolveScreen(spec).name} (custom)`, spec);
        o.dataset.custom = '1';
        toSelect.prepend(o);
      }
      toSelect.value = spec;
    }
    if (ratioId) check('to-ratio', ratioId);
    sync();
  }

  function sync() {
    fromOther.hidden = fromSelect.value !== OTHER;
    const pill = checked('to-pill');
    toRatio.hidden = !SIZE_PILLS.some((p) => p.id === pill);
    toModel.hidden = pill !== MODEL_PILL;
    apply.disabled = !(readFrom() && readTo());
  }

  fromSelect.addEventListener('change', () => {
    fromNote.textContent = '';
    if (!toTouched) {
      const from = readFrom();
      showTo(suggestFor(from));
    }
    sync();
  });
  fromDiag.addEventListener('input', () => { if (!toTouched) showTo(suggestFor(readFrom())); sync(); });
  fromRatios.addEventListener('change', sync);
  toPills.addEventListener('change', (e) => {
    toTouched = true;
    const id = e.target.value;
    if (SIZE_PILLS.some((p) => p.id === id)) check('to-ratio', defaultRatio(id));
    sync();
    if (id === MODEL_PILL) toSelect.focus();
  });
  toRatio.addEventListener('change', () => { toTouched = true; sync(); });
  toSelect.addEventListener('change', () => { toTouched = true; sync(); });

  apply.addEventListener('click', () => {
    const from = readFrom();
    const to = readTo();
    if (!from || !to) return;
    dialog.close();
    onApply({ from, to });
  });
  $(dialog, '#setup-cancel').addEventListener('click', () => dialog.close());
  // A click on the backdrop (the dialog element itself, outside its content) closes it.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  return {
    /** Open with the current choices. `from` may be null (nothing chosen yet); `focus` is 'from' or 'to'. */
    open({ from, to, note = '', focus = 'from', followTo = true }) {
      toTouched = !followTo;
      const s = resolveScreen(from);
      if (s?.custom) {
        fromSelect.value = OTHER;
        fromDiag.value = s.diagonalIn;
        check('from-ratio', s.ratioId);
      } else {
        fromSelect.value = s ? s.id : '';
        check('from-ratio', RATIO_CHOICES[0].id);
      }
      fromNote.textContent = note;
      showTo(resolveScreen(to) ? to : suggestFor(from));
      dialog.showModal();
      (focus === 'to' ? dialog.querySelector('input[name="to-pill"]:checked') : fromSelect)?.focus();
    },
  };
}
