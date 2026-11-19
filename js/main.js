import { createPicker } from './picker.js';
import { initCalibrate } from './calibrate.js';
import { initRender } from './render.js';
import { guessCurrent, parseState, resolveScreen, serializeState } from './state.js';
import { areaRatio, formatCm, fitsInside, overflowPerSide, pxPerMm } from './geometry.js';

const defaults = (() => {
  const from = guessCurrent(window.screen.width, window.screen.height);
  return { from, to: from === 'mbp14' ? 'mba13' : 'mbp14' };
})();

const state = parseState(location.search, defaults);
const $ = (sel) => document.querySelector(sel);

function axis(mm, bigWord, smallWord) {
  if (Math.abs(mm) < 1) return 'the same';
  const abs = formatCm(Math.abs(mm));
  return mm > 0 ? `${abs} ${bigWord}` : `${abs} ${smallWord}`;
}

function renderResult(from, to) {
  const pct = Math.round(areaRatio(to, from) * 100);
  const o = overflowPerSide(to, from);
  const dims = (s) => `${formatCm(s.widthMm)} × ${formatCm(s.heightMm)}`;
  const fits = fitsInside(to, from);
  let head;
  if (pct === 100 && Math.abs(o.sideMm) < 1 && Math.abs(o.topMm) < 1) {
    head = `${to.name} is the same size as your screen.`;
  } else if (fits) {
    head = `${to.name} is ${pct} % of your screen's area.`;
  } else {
    head = `${to.name} is ${pct} % of your screen's area, so it does not fit.`;
  }
  const edges = fits
    ? ''
    : `<p>It is ${axis(o.sideMm, 'wider on each side', 'narrower on each side')} and ${axis(o.topMm, 'taller on top and bottom', 'shorter on top and bottom')}.</p>`;
  $('#result').innerHTML = `
    <p class="big">${head}</p>
    ${edges}
    <dl class="facts">
      <dt>Your screen</dt><dd>${dims(from)} (${from.diagonalIn}" diagonal)</dd>
      <dt>Compared</dt><dd>${dims(to)} (${to.diagonalIn}" diagonal)</dd>
    </dl>`;
}

// Debounced and guarded: Safari rate-limits replaceState and file:// pages may refuse it.
let urlTimer;
function writeUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    try { history.replaceState(null, '', serializeState(state)); } catch { /* keep working without a shareable URL */ }
  }, 250);
}

function update() {
  const from = resolveScreen(state.from);
  const to = resolveScreen(state.to);
  if (!from || !to) return;
  const scale = state.cal ?? pxPerMm(window.screen.width, from.widthMm);
  writeUrl();
  renderResult(from, to);
  document.dispatchEvent(new CustomEvent('compare', { detail: { from, to, scale, state } }));
}

initRender();
initCalibrate((v) => { state.cal = v; update(); });

createPicker($('.picker[data-role=from]'), {
  value: state.from,
  onChange: (v) => { state.from = v; state.cal = null; update(); },
});
createPicker($('.picker[data-role=to]'), {
  value: state.to,
  onChange: (v) => { state.to = v; update(); },
});
$('#fill').checked = state.fill;
if (state.cal) $('#calibrate').open = true;
$('#fill').addEventListener('change', (e) => { state.fill = e.target.checked; update(); });

update();

const toggle = $('#drawing-toggle');
function setDrawingOnly(on) {
  $('#page').classList.toggle('drawing-only', on);
  toggle.setAttribute('aria-pressed', String(on));
  toggle.textContent = on ? 'Show panels' : 'Show drawing only';
}
toggle.addEventListener('click', () => setDrawingOnly(toggle.getAttribute('aria-pressed') !== 'true'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawingOnly(false); });
