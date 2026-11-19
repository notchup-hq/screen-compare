import { initCalibrate } from './calibrate.js';
import { createSetup } from './setup.js';
import { draw, initRender, renderOverview } from './render.js';
import { matchScreens } from './detect.js';
import { smallerThan } from './intro.js';
import { parseState, resolveScreen, serializeState } from './state.js';
import { VERSION } from './version.js';
import { areaRatio, formatCm, pxPerMm } from './geometry.js';

const $ = (sel) => document.querySelector(sel);

$('#version').textContent = `v${VERSION}`;

// State lives in the link. A link with a valid `to` and a known screen goes straight to the result;
// anything else starts at the start view. Nothing is stored anywhere.
const params = new URLSearchParams(location.search);
const linkFrom = resolveScreen(params.get('from')) ? params.get('from') : null;
const linkTo = resolveScreen(params.get('to')) ? params.get('to') : null;

// Without a valid ?from, guess the current screen from its resolution. Only a single match is
// preselected; several or none leave the choice to the visitor.
const guess = linkFrom ? null : matchScreens(window.screen.width, window.screen.height, window.devicePixelRatio || 1);
const guessedFrom = guess && guess.matches.length === 1 ? guess.matches[0] : null;

const state = parseState(location.search, { from: linkFrom ?? guessedFrom, to: linkTo ?? smallerThan(linkFrom ?? guessedFrom) });
let fromSource = linkFrom ? 'link' : guessedFrom ? 'detected' : null; // where "your screen" came from

let view = linkTo && state.from ? 'result' : 'start';

const sizeName = (screen) => screen.short ?? screen.name;

function setView(next) {
  view = next;
  document.body.dataset.view = next;
  $('#start').hidden = next !== 'start';
  $('#result').hidden = next !== 'result';
}

// Debounced and guarded: Safari rate-limits replaceState and file:// pages may refuse it.
let urlTimer;
function writeUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    try { history.replaceState(null, '', serializeState(state)); } catch { /* keep working without a shareable link */ }
  }, 250);
}

function renderFacts(from, to) {
  const dims = (s) => `${formatCm(s.widthMm)} × ${formatCm(s.heightMm)}`;
  $('#facts').innerHTML = `
    <dl class="facts">
      <dt>Your screen</dt><dd>${sizeName(from)}: ${dims(from)} (${from.diagonalIn}" diagonal)</dd>
      <dt>Compared</dt><dd>${sizeName(to)}: ${dims(to)} (${to.diagonalIn}" diagonal)</dd>
      <dt>Area</dt><dd>${Math.round(areaRatio(to, from) * 100)} % of yours</dd>
    </dl>`;
}

async function goFullscreen() {
  try { await document.documentElement.requestFullscreen(); } catch { /* the card keeps explaining */ }
}

function update() {
  const from = resolveScreen(state.from);
  const to = resolveScreen(state.to);
  if (!from || !to || view !== 'result') return;
  const scale = state.cal ?? pxPerMm(window.screen.width, from.widthMm);
  writeUrl();
  $('#from-btn').textContent = sizeName(from);
  $('#to-btn').textContent = sizeName(to);
  $('#fill').checked = state.fill;
  $('#tune-dot').hidden = !state.cal;
  $('#tune-state').textContent = state.cal ? ' (adjusted)' : '';
  renderFacts(from, to);
  renderOverview($('#overview'), from, to);
  document.dispatchEvent(new CustomEvent('compare', { detail: { scale } }));
  draw({
    from,
    to,
    scale,
    fill: state.fill,
    pct: Math.round(areaRatio(to, from) * 100),
    canFullscreen: document.fullscreenEnabled === true,
    onFullscreen: goFullscreen,
  });
}

// What the note under "Your screen" says. It only describes how the choice was made.
function fromNote() {
  if (fromSource === 'link') return 'From your link.';
  if (fromSource === 'detected') return 'Detected from your screen. Change if wrong.';
  if (state.from || !guess) return '';
  const [w, h] = guess.native;
  return guess.matches.length
    ? `Your screen is ${w} × ${h} pixels, which fits several laptops. Pick yours.`
    : `Your screen is ${w} × ${h} pixels, which matches no preset. Pick yours or choose Other size.`;
}

const setup = createSetup($('#setup'), {
  onApply({ from, to }) {
    if (from !== state.from) state.cal = null; // the calibration belongs to the screen it was measured on
    state.from = from;
    state.to = to;
    fromSource = 'user';
    const wasStart = view === 'start';
    setView('result');
    update();
    if (wasStart) $('#to-btn').focus(); // the Start button has just gone away
  },
});

function openSetup(focus) {
  setup.open({
    from: state.from,
    to: view === 'result' ? state.to : (linkTo ?? (state.from ? smallerThan(state.from) : 'g14')),
    note: fromNote(),
    focus,
    followTo: view !== 'result' && !linkTo,
  });
}

$('#start-btn').addEventListener('click', () => openSetup('from'));
$('#from-btn').addEventListener('click', () => openSetup('from'));
$('#to-btn').addEventListener('click', () => openSetup('to'));

$('#swap-btn').addEventListener('click', () => {
  [state.from, state.to] = [state.to, state.from];
  state.cal = null;
  fromSource = 'user';
  update();
});

$('#fill').addEventListener('change', (e) => { state.fill = e.target.checked; update(); });

// Drawer: Details or Fine-tune.
const drawer = $('#drawer');
function openDrawer(kind) {
  const tune = kind === 'tune';
  $('#drawer-h').textContent = tune ? 'Fine-tune with a bank card' : 'Details';
  $('#panel-details').hidden = tune;
  $('#panel-tune').hidden = !tune;
  drawer.showModal();
}
$('#details-btn').addEventListener('click', () => openDrawer('details'));
$('#tune-btn').addEventListener('click', () => openDrawer('tune'));
$('#drawer-close').addEventListener('click', () => drawer.close());
drawer.addEventListener('click', (e) => { if (e.target === drawer) drawer.close(); });

initCalibrate((v) => { state.cal = v; update(); });
initRender();

// Full screen: the toolbar and footer step aside; Esc or the button on the stage leaves it.
function syncFullscreen() {
  const on = Boolean(document.fullscreenElement);
  document.body.classList.toggle('is-fullscreen', on);
  $('#exit-fs').hidden = !on;
}
document.addEventListener('fullscreenchange', syncFullscreen);
$('#exit-fs').addEventListener('click', () => document.exitFullscreen());

setView(view);
update();
