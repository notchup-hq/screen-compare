// Searchable screen picker: an ARIA combobox (list autocomplete) plus an
// "Other size" option that reveals diagonal + aspect-ratio chips.

import { SCREENS, RATIOS } from './screens.js';
import { resolveScreen, customSpec } from './state.js';

const OTHER = '__other__';

export function createPicker(root, { value, onChange }) {
  const id = root.dataset.role;
  const label = root.dataset.label;
  root.innerHTML = `
    <label for="${id}-input">${label}</label>
    <div class="picker-box">
      <input id="${id}-input" type="text" role="combobox" aria-expanded="false"
        aria-controls="${id}-list" aria-autocomplete="list" autocomplete="off" spellcheck="false">
      <ul id="${id}-list" role="listbox" aria-label="${label} options" hidden></ul>
    </div>
    <div class="custom" hidden>
      <label class="custom-diag">Diagonal (inches)
        <input type="number" inputmode="decimal" min="5" max="30" step="0.1" value="16">
      </label>
      <fieldset>
        <legend>Aspect ratio</legend>
        ${RATIOS.map((r, i) => `
          <label class="chip"><input type="radio" name="${id}-ratio" value="${r.id}"${i === 0 ? ' checked' : ''}><span>${r.label}</span></label>`).join('')}
      </fieldset>
    </div>`;

  const input = root.querySelector('input[role=combobox]');
  const list = root.querySelector('ul');
  const custom = root.querySelector('.custom');
  const diag = custom.querySelector('input[type=number]');

  let current = value;
  let options = [];
  let active = -1;

  const nameOf = (spec) => resolveScreen(spec)?.name ?? '';

  function showCurrent() {
    const s = resolveScreen(current);
    input.value = s ? (s.custom ? `${s.name} (custom)` : s.name) : '';
    custom.hidden = !s?.custom;
    if (s?.custom) {
      diag.value = s.diagonalIn;
      const radio = custom.querySelector(`input[value="${s.ratioId}"]`);
      if (radio) radio.checked = true;
    }
  }

  function render(filter) {
    const q = filter.trim().toLowerCase();
    const hits = SCREENS.filter((s) => !q || s.name.toLowerCase().includes(q) || `${s.diagonalIn}`.includes(q));
    options = [...hits.map((s) => ({ id: s.id, name: s.name })), { id: OTHER, name: 'Other size…' }];
    list.innerHTML = options
      .map((o, i) => `<li role="option" id="${id}-opt-${i}" data-id="${o.id}" aria-selected="${o.id === current}">${o.name}</li>`)
      .join('');
    setActive(Math.max(0, options.findIndex((o) => o.id === current)));
  }

  function setActive(i) {
    active = i;
    list.querySelectorAll('li').forEach((li, n) => li.classList.toggle('active', n === i));
    if (i >= 0) {
      input.setAttribute('aria-activedescendant', `${id}-opt-${i}`);
      const li = list.children[i];
      if (li) {
        if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop;
        else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight;
      }
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function open(filter = '') {
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    render(filter);
  }

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function choose(optId) {
    close();
    if (optId === OTHER) {
      const s = resolveScreen(current);
      const typed = Number(diag.value);
      const d = typed >= 5 && typed <= 30 ? typed : 16;
      diag.value = d;
      const spec = s?.custom ? current : customSpec(d, custom.querySelector('input:checked').value);
      current = spec;
      showCurrent();
      custom.hidden = false;
      diag.focus();
      onChange(spec);
      return;
    }
    current = optId;
    showCurrent();
    onChange(optId);
  }

  input.addEventListener('focus', () => input.select());
  input.addEventListener('click', () => { if (list.hidden) open(); });
  input.addEventListener('input', () => open(input.value));
  input.addEventListener('blur', () => { close(); showCurrent(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (list.hidden) open();
      else setActive(Math.min(options.length - 1, active + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) open();
      else setActive(Math.max(0, active - 1));
    } else if (e.key === 'Enter' && !list.hidden && options[active]) {
      e.preventDefault();
      choose(options[active].id);
    } else if (e.key === 'Escape' && !list.hidden) {
      e.preventDefault();
      close();
      showCurrent();
    }
  });
  // mousedown (not click) so the input's blur does not close the list first
  list.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const li = e.target.closest('li');
    if (li) choose(li.dataset.id);
  });

  function customChanged() {
    const d = Number(diag.value);
    if (!(d >= 5 && d <= 30)) return;
    current = customSpec(d, custom.querySelector('input:checked').value);
    input.value = `${nameOf(current)} (custom)`;
    onChange(current);
  }
  diag.addEventListener('input', customChanged);
  custom.addEventListener('change', (e) => { if (e.target.type === 'radio') customChanged(); });

  showCurrent();
  return {
    set(spec) { current = spec; showCurrent(); },
  };
}
