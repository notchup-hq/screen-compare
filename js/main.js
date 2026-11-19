import { initCalibrate } from './calibrate.js';
import { createSetup } from './setup.js';
import { initDetails } from './details.js';
import { draw, initRender, renderOverview } from './render.js';
import { matchScreens, nativeResolution } from './detect.js';
import { smallerThan, smallerThanSize } from './intro.js';
import { parseState, resolveScreen, serializeState, startOverUrl } from './state.js';
import { accuracy, accuracyText } from './accuracy.js';
import { RATIOS } from './screens.js';
import { SIZE_RATIO_CHOICES } from './compare-options.js';
import { DEFAULT_PX_PER_MM, usableResolution, yourScreen } from './scale.js';
import { VERSION } from './version.js';
import { areaRatio, formatCm } from './geometry.js';

const $ = (sel) => document.querySelector(sel);

$('#version').textContent = `v${VERSION}`;

// State lives in the link. A link with a valid `to` and a way to know your screen (a size, a card
// measurement or a model) goes straight to the result; anything else starts at the start view.
// Nothing is stored anywhere.
const link = parseState(location.search, { from: null, to: null });

const screenNow = () => ({ width: window.screen.width, height: window.screen.height, dpr: window.devicePixelRatio || 1 });

// Without a way to know your screen in the link, guess a laptop model from the resolution. Only a
// single match is preselected; several or none leave the choice to the visitor. Monitors and
// generic sizes are never guessed.
const hasYou = Boolean(link.from || link.size || link.cal);
const now = screenNow();
const guess = hasYou ? null : matchScreens(now.width, now.height, now.dpr);
const guessedFrom = guess && guess.matches.length === 1 ? guess.matches[0] : null;

const state = {
  ...link,
  ratio: usableResolution(now.width, now.height) ? null : link.ratio, // only needed when the resolution is no help
  from: link.from ?? guessedFrom,
  to: link.to ?? (link.size ? smallerThanSize(link.size) : smallerThan(link.from ?? guessedFrom)),
};

let view = link.to && (state.from || state.size || state.cal) ? 'result' : 'start';

/** Your screen from what is in `f` ({ from, size, res, ratio, cal }), or null when nothing is known. */
function yourFor(f) {
  return yourScreen({
    preset: resolveScreen(f.from),
    sizeIn: f.size,
    res: f.res,
    ratio: RATIOS.find((r) => r.id === f.ratio)?.value ?? null,
    cal: f.cal,
    css: { width: window.screen.width, height: window.screen.height },
    dpr: window.devicePixelRatio || 1,
  });
}

function emitCompare(scale, cal) {
  document.dispatchEvent(new CustomEvent('compare', { detail: { scale, cal } }));
}

const sizeName = (screen) => screen.short ?? screen.name;

function setView(next) {
  view = next;
  if (next === 'result') window.scrollTo(0, 0);
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
  const dims = (x) => `${formatCm(x.widthMm)} × ${formatCm(x.heightMm)}`;
  const yours = from.basis === 'card'
    ? `Measured with a card: about ${Math.round(from.diagonalIn * 10) / 10}" (${dims(from)})`
    : `${from.basis === 'model' ? `${sizeName(from)}: ` : ''}${dims(from)} (${+from.diagonalIn.toFixed(2)}" diagonal, ${from.basis === 'size' ? 'typed size' : 'size of the model'})`;
  $('#facts').innerHTML = `
    <dl class="facts">
      <dt>Your screen</dt><dd>${yours}</dd>
      <dt>Compared</dt><dd>${sizeName(to)}: ${dims(to)} (${to.diagonalIn}" diagonal)</dd>
      <dt>Area</dt><dd>${Math.round(areaRatio(to, from) * 100)} % of yours</dd>
    </dl>`;
}

async function goFullscreen() {
  try { await document.documentElement.requestFullscreen(); } catch { /* the card keeps explaining */ }
}

function update() {
  const from = yourFor(state);
  const to = resolveScreen(state.to);
  if (!from || !to || view !== 'result') return;
  const scale = from.pxPerMm;
  writeUrl();
  $('#from-btn').textContent = sizeName(from);
  $('#to-btn').textContent = sizeName(to);
  $('#fill').checked = state.fill;
  $('#tune-dot').hidden = !state.cal;
  $('#tune-state').textContent = state.cal ? ' (adjusted)' : '';
  renderFacts(from, to);
  renderOverview($('#overview'), from, to);
  details.sync({ basis: from.basis, res: from.res ?? null, edited: state.res, ratio: state.ratio, to: state.to });
  emitCompare(scale, state.cal);
  const kind = accuracy({
    your: from,
    screen: screenNow(),
    win: { outerWidth: window.outerWidth, innerWidth: window.innerWidth },
    detected: state.from !== null && state.from === guessedFrom,
  });
  draw({
    from,
    to,
    scale,
    accuracy: kind,
    accuracyLabel: accuracyText(kind, from),
    onCheckCard: () => openDrawer('tune'),
    fill: state.fill,
    pct: Math.round(areaRatio(to, from) * 100),
    canFullscreen: document.fullscreenEnabled === true,
    onFullscreen: goFullscreen,
  });
}

// Resolution and aspect ratios live in the Details drawer. Clearing an edited resolution on a screen
// that reports none falls back to 16:9, as the setup used to.
const details = initDetails($('#drawer'), {
  onChange(patch) {
    if ('res' in patch) {
      state.res = patch.res;
      if (!patch.res && !usableResolution(now.width, now.height) && !state.ratio) state.ratio = SIZE_RATIO_CHOICES[0].id;
    }
    if ('ratio' in patch) state.ratio = patch.ratio;
    if ('to' in patch) state.to = patch.to;
    update();
  },
});

let applied = false; // the setup closed because a choice was applied (it has just redrawn)
const setup = createSetup($('#setup'), {
  native: nativeResolution(now.width, now.height, now.dpr),
  diagonalOf: (your) => yourFor(your ?? {})?.diagonalIn ?? null,
  onApply({ cal, from, size, res, ratio, to }) {
    // The setup dialog hands over exactly one way to know your screen; the others are cleared.
    state.cal = cal ?? null;
    state.from = from ?? null;
    state.size = size ?? null;
    state.res = res ?? null;
    state.ratio = ratio ?? null;
    state.to = to;
    const wasStart = view === 'start';
    applied = true;
    setView('result');
    update();
    if (wasStart) $('#to-btn').focus(); // the Start button has just gone away
  },
  onMeasure({ your }) {
    emitCardScale(your ?? {});
    openDrawer('tune');
  },
});

/** Draw the card in the fine-tune drawer at the scale of `f` (a draft from the setup dialog). */
function emitCardScale(f) {
  emitCompare(f.cal ?? yourFor(f)?.pxPerMm ?? DEFAULT_PX_PER_MM, f.cal ?? null);
}

function openSetup(focus) {
  setup.open({
    your: { cal: state.cal, from: state.from, size: state.size, res: state.res, ratio: state.ratio },
    to: view === 'result' ? state.to : link.to,
    focus,
  });
}

$('#start-btn').addEventListener('click', () => openSetup('from'));
$('#from-btn').addEventListener('click', () => openSetup('from'));
$('#to-btn').addEventListener('click', () => openSetup('to'));

$('#fill').addEventListener('change', (e) => { state.fill = e.target.checked; update(); });

// Drawer: Details or Fine-tune.
const drawer = $('#drawer');
function openDrawer(kind) {
  const tune = kind === 'tune';
  $('#drawer-h').textContent = tune ? 'Check the real size with a card' : 'Details';
  $('#panel-details').hidden = tune;
  $('#panel-tune').hidden = !tune;
  drawer.showModal();
}
$('#details-btn').addEventListener('click', () => openDrawer('details'));
$('#tune-btn').addEventListener('click', () => openDrawer('tune'));
$('#drawer-close').addEventListener('click', () => drawer.close());
drawer.addEventListener('click', (e) => { if (e.target === drawer) drawer.close(); });
// The card drawer opens over the setup dialog; when it closes, put focus back there.
drawer.addEventListener('close', () => { if (setup.isOpen()) setup.refocus(); });
// Closing the setup without applying drops a card draft: redraw the card at the real scale.
$('#setup').addEventListener('close', () => {
  if (applied) applied = false;
  else update();
});

window.addEventListener('resize', () => update()); // browser zoom fires resize
initCalibrate((v) => {
  if (setup.isOpen()) {
    // Measuring from the setup dialog: a draft until "Show at real size".
    setup.setCal(v);
    emitCardScale(setup.readYour() ?? {});
  } else if (v === null && !state.from && !state.size) {
    // Resetting a card-only measurement leaves nothing to draw: ask for the size again.
    drawer.close();
    startOver();
    openSetup('from');
  } else {
    state.cal = v;
    update();
  }
});
initRender();

// Full screen and Drawing only: the toolbar and footer step aside. A floating Exit button is always
// there, and Esc leaves Drawing only (the browser handles Esc in full screen itself).
let drawingOnly = false;
function syncChrome() {
  const fs = Boolean(document.fullscreenElement);
  document.body.classList.toggle('is-fullscreen', fs);
  document.body.classList.toggle('is-drawing', drawingOnly);
  $('#drawing-btn').setAttribute('aria-pressed', String(drawingOnly));
  const exit = $('#exit-view');
  exit.hidden = !(fs || drawingOnly);
  exit.textContent = fs ? 'Exit full screen' : 'Exit drawing only';
  if (!fs && !drawingOnly) window.scrollTo(0, 0);
}
function setDrawingOnly(on, { refocus = false } = {}) {
  drawingOnly = on;
  syncChrome();
  if (on) $('#exit-view').focus();
  else if (refocus) $('#drawing-btn').focus();
}
document.addEventListener('fullscreenchange', syncChrome);
$('#drawing-btn').addEventListener('click', () => setDrawingOnly(true));
$('#exit-view').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else setDrawingOnly(false, { refocus: true });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && drawingOnly && !document.querySelector('dialog[open]')) setDrawingOnly(false, { refocus: true });
});

// Start over: clear the comparison from the link and return to the start view.
function startOver() {
  clearTimeout(urlTimer);
  if (document.fullscreenElement) document.exitFullscreen();
  drawingOnly = false;
  syncChrome();
  try { history.replaceState(null, '', startOverUrl(location.pathname, location.hash)); } catch { /* nothing to clear */ }
  Object.assign(state, { from: guessedFrom, size: null, res: null, ratio: null, cal: null, fill: false });
  state.to = smallerThan(guessedFrom);
  setView('start');
  window.scrollTo(0, 0);
  $('#start-btn').focus();
}
$('#start-over-btn').addEventListener('click', startOver);

setView(view);
update();
