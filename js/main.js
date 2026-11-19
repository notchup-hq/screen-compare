import { initCalibrate } from './calibrate.js';
import { createMemory, defaultName, matchProfile, signatureOf } from './memory.js';
import { createSetup } from './setup.js';
import { initDetails } from './details.js';
import { initMenu } from './menu.js';
import { draw, initRender, renderOverview } from './render.js';
import { matchScreens, nativeResolution } from './detect.js';
import { smallerThan, smallerThanSize } from './suggest.js';
import { parseState, resolveScreen, serializeState, startOverUrl } from './state.js';
import { accuracy, accuracyText } from './accuracy.js';
import { RATIOS } from './screens.js';
import { SIZE_RATIO_CHOICES } from './compare-options.js';
import { DEFAULT_PX_PER_MM, round1, usableResolution, yourScreen } from './scale.js';
import { VERSION } from './version.js';
import { areaRatio, formatCm } from './geometry.js';

const $ = (sel) => document.querySelector(sel);

// Every element this script talks to, looked up once. (#cal-remember and its row are made by
// initCalibrate, so they are looked up right after it.)
const ui = {
  start: $('#start'),
  result: $('#result'),
  startBtn: $('#start-btn'),
  startOverBtn: $('#start-over-btn'),
  fromBtn: $('#from-btn'),
  toBtn: $('#to-btn'),
  fill: $('#fill'),
  fullscreenBtn: $('#fullscreen-btn'),
  drawingBtn: $('#drawing-btn'),
  exitView: $('#exit-view'),
  detailsBtn: $('#details-btn'),
  tuneBtn: $('#tune-btn'),
  tuneDot: $('#tune-dot'),
  tuneState: $('#tune-state'),
  facts: $('#facts'),
  overview: $('#overview'),
  setup: $('#setup'),
  drawer: $('#drawer'),
  drawerHeading: $('#drawer-h'),
  drawerClose: $('#drawer-close'),
  panelDetails: $('#panel-details'),
  panelTune: $('#panel-tune'),
  rememberedStatus: $('#remembered-status'),
  rememberLive: $('#remember-live'),
};

$('#version').textContent = `v${VERSION}`;

// State lives in the link. A link with a valid `to` and a way to know your screen (a size, a card
// measurement or a model) goes straight to the result; anything else starts at the start view.
// The only thing ever stored is a screen the visitor asked to remember (js/memory.js).
const link = parseState(location.search, { from: null, to: null });

const screenNow = () => ({ width: window.screen.width, height: window.screen.height, dpr: window.devicePixelRatio || 1 });

// Your screen comes from, strongest first: the link, the screen remembered for this display (same
// width, height and pixel ratio), a laptop model guessed from the resolution. Only a single match is
// guessed; several or none leave the choice to the visitor. Monitors and generic sizes are never guessed.
const memory = createMemory();
let profiles = memory.list();
const now = screenNow();
const currentSig = () => signatureOf(screenNow());
const currentProfile = () => matchProfile(profiles, currentSig());
const profileYou = (p) => ({ from: p.from, size: p.size, res: p.res, ratio: p.ratio, cal: p.cal });
const noYou = { from: null, size: null, res: null, ratio: null, cal: null };

const linkHasYou = Boolean(link.from || link.size || link.cal);
const guess = matchScreens(now.width, now.height, now.dpr);
const guessedFrom = guess && guess.matches.length === 1 ? guess.matches[0] : null;

/** Your screen without a link: the screen remembered for this display, else the guess, else nothing. */
function homeScreen() {
  const profile = currentProfile();
  return {
    // Where your screen came from; only a guess is labelled "(detected)".
    source: profile ? 'profile' : guessedFrom ? 'guess' : null,
    you: profile ? profileYou(profile) : { ...noYou, from: guessedFrom },
  };
}
const ratioIfNeeded = (you) => ({ ...you, ratio: usableResolution(now.width, now.height) ? null : you.ratio }); // only needed when the resolution is no help
const suggestedTo = (you) => (you.size ? smallerThanSize(you.size) : smallerThan(you.from));

const initial = linkHasYou ? { source: 'link', you: link } : homeScreen();
let source = initial.source; // 'link' | 'profile' | 'guess' | null

const state = { ...link, ...ratioIfNeeded(initial.you) };
state.to = link.to ?? suggestedTo(state);

let view = link.to && (state.from || state.size || state.cal) ? 'result' : 'start';

/** Your screen from what is in `f` ({ from, size, res, ratio, cal }), or null when nothing is known. */
function yourFor(f) {
  const { width, height, dpr } = screenNow();
  return yourScreen({
    preset: resolveScreen(f.from),
    sizeIn: f.size,
    res: f.res,
    ratio: RATIOS.find((r) => r.id === f.ratio)?.value ?? null,
    cal: f.cal,
    css: { width, height },
    dpr,
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
  ui.start.hidden = next !== 'start';
  ui.result.hidden = next !== 'result';
}

// ---- Remembered screens (js/memory.js is the only code that touches storage).
const REMEMBER_FAILED = "Couldn't remember this screen in this browser.";

function rememberNote(text) {
  ui.rememberedStatus.textContent = text;
  ui.rememberLive.textContent = text;
}

/** Remember the screen as it is now (a card, a typed size or a model), on this display. */
function rememberNow() {
  const you = yourFor(state);
  if (!you || !memory.available()) return false;
  const ok = memory.save({
    name: defaultName(you), sig: currentSig(), saved: Date.now(),
    from: state.from, size: state.size, res: state.res, ratio: state.ratio, cal: state.cal,
  });
  profiles = memory.list();
  rememberNote(ok ? '' : REMEMBER_FAILED);
  return ok;
}

function forgetNow() {
  const p = currentProfile();
  if (!p) return;
  memory.remove(p.sig);
  profiles = memory.list();
}

function refreshMemory() {
  profiles = memory.list();
  update();
}

// Debounced and guarded: Safari rate-limits replaceState and file:// pages may refuse it.
let urlTimer;
function writeUrl() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    try { history.replaceState(null, '', serializeState(state)); } catch { /* keep working without a shareable link */ }
  }, 250);
}

let factsHtml = '';
function renderFacts(from, to) {
  const dims = (x) => `${formatCm(x.widthMm)} × ${formatCm(x.heightMm)}`;
  const yours = from.basis === 'card'
    ? `Measured with a card: about ${round1(from.diagonalIn)}" (${dims(from)})`
    : `${from.basis === 'model' ? `${sizeName(from)}: ` : ''}${dims(from)} (${+from.diagonalIn.toFixed(2)}" diagonal, ${from.basis === 'size' ? 'typed size' : 'size of the model'})`;
  const html = `
    <dl class="facts">
      <dt>Your screen</dt><dd>${yours}</dd>
      <dt>Compared</dt><dd>${sizeName(to)}: ${dims(to)} (${to.diagonalIn}" diagonal)</dd>
      <dt>Area</dt><dd>${Math.round(areaRatio(to, from) * 100)} % of yours</dd>
    </dl>`;
  if (html === factsHtml) return;
  factsHtml = html;
  ui.facts.innerHTML = html;
}

let overviewKey = '';
function updateOverview(from, to) {
  const key = [from.widthMm, from.heightMm, to.name, to.widthMm, to.heightMm].join('|');
  if (key === overviewKey) return;
  overviewKey = key;
  renderOverview(ui.overview, from, to);
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
  ui.fromBtn.textContent = sizeName(from);
  ui.toBtn.textContent = sizeName(to);
  ui.fill.checked = state.fill;
  ui.tuneDot.hidden = !state.cal;
  ui.tuneState.textContent = state.cal ? ' (adjusted)' : '';
  renderFacts(from, to);
  updateOverview(from, to);
  details.sync({ basis: from.basis, res: from.res ?? null, edited: state.res, ratio: state.ratio, to: state.to });
  details.syncRemembered({ available: memory.available(), profiles, currentSig: currentSig() });
  emitCompare(scale, state.cal);
  const kind = accuracy({
    your: from,
    screen: screenNow(),
    win: { outerWidth: window.outerWidth, innerWidth: window.innerWidth },
    detected: source === 'guess' && state.from !== null && state.from === guessedFrom,
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
initMenu($('#menu-btn'), $('#options'));

const details = initDetails(ui.drawer, {
  onRename(sig, name) {
    if (memory.rename(sig, name)) refreshMemory();
    else rememberNote(REMEMBER_FAILED);
  },
  onDelete(sig) {
    memory.remove(sig);
    rememberNote('');
    refreshMemory();
  },
  onClear() {
    memory.clear();
    refreshMemory();
    rememberNote('Forgot all remembered screens.');
  },
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
const setup = createSetup(ui.setup, {
  native: nativeResolution(now.width, now.height, now.dpr),
  diagonalOf: (your) => yourFor(your ?? {})?.diagonalIn ?? null,
  onApply({ cal, from, size, res, ratio, to, remember }) {
    // The setup dialog hands over exactly one way to know your screen; the others are cleared.
    state.cal = cal ?? null;
    state.from = from ?? null;
    state.size = size ?? null;
    state.res = res ?? null;
    state.ratio = ratio ?? null;
    state.to = to;
    // The checkbox: ticked remembers this screen, unticked (when it was remembered) forgets it.
    if (remember === true) rememberNote(rememberNow() ? '' : REMEMBER_FAILED);
    else if (remember === false) forgetNow();
    const wasStart = view === 'start';
    applied = true;
    setView('result');
    update();
    if (wasStart) ui.toBtn.focus(); // the Start button has just gone away
  },
  // "Forget this screen" on the first question: the profile is handed back so Undo can save it again.
  onForget() {
    const gone = memory.take(currentSig());
    profiles = memory.list();
    return gone;
  },
  onRestore(profile) {
    const ok = memory.save(profile);
    profiles = memory.list();
    return ok;
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
    // null: storage is blocked, so there is nothing to offer.
    remember: memory.available() ? { checked: Boolean(currentProfile()) } : null,
    // On the start view a remembered screen is shown on the first question, to confirm or change.
    profile: view === 'start' && source === 'profile' && currentProfile() ? { saved: currentProfile().saved } : null,
  });
}

ui.startBtn.addEventListener('click', () => openSetup('from'));
ui.fromBtn.addEventListener('click', () => openSetup('from'));
ui.toBtn.addEventListener('click', () => openSetup('to'));

ui.fill.addEventListener('change', (e) => { state.fill = e.target.checked; update(); });

// Drawer: Details or Fine-tune.
const drawer = ui.drawer;
let drawerKind = 'details';
let tuneTouched = false; // the card was moved, or the checkbox was changed, since the drawer opened
let skipRemember = false;
function openDrawer(kind) {
  const tune = kind === 'tune';
  drawerKind = kind;
  if (tune) {
    // Measuring from the setup dialog uses that dialog's own checkbox.
    calRememberRow.hidden = !memory.available() || setup.isOpen();
    calRemember.checked = Boolean(currentProfile());
    tuneTouched = false;
    skipRemember = false;
  }
  drawer.classList.toggle('drawer-tune', tune);
  ui.drawerHeading.textContent = tune ? 'Check the real size with a card' : 'Details';
  ui.panelDetails.hidden = tune;
  ui.panelTune.hidden = !tune;
  drawer.showModal();
}
ui.detailsBtn.addEventListener('click', () => openDrawer('details'));
ui.tuneBtn.addEventListener('click', () => openDrawer('tune'));
ui.drawerClose.addEventListener('click', () => drawer.close());
drawer.addEventListener('click', (e) => { if (e.target === drawer) drawer.close(); });
// The card drawer opens over the setup dialog; when it closes, put focus back there.
drawer.addEventListener('close', () => {
  if (setup.isOpen()) { setup.refocus(); return; }
  if (drawerKind === 'tune' && tuneTouched && !skipRemember && !calRememberRow.hidden) {
    if (calRemember.checked) { if (!rememberNow()) rememberNote(REMEMBER_FAILED); } else forgetNow();
    refreshMemory();
  }
  tuneTouched = false;
});
// Closing the setup without applying drops a card draft: redraw the card at the real scale.
ui.setup.addEventListener('close', () => {
  if (applied) applied = false;
  else update();
});

// Browser zoom fires resize and changes the scale. One update per frame however many events come; the
// stage's own redraw is skipped when nothing it draws has changed (see draw in js/render.js).
let updateFrame = 0;
window.addEventListener('resize', () => {
  if (updateFrame) return;
  updateFrame = requestAnimationFrame(() => { updateFrame = 0; update(); });
});
initCalibrate((v) => {
  if (setup.isOpen()) {
    // Measuring from the setup dialog: a draft until "Show at real size".
    setup.setCal(v);
    emitCardScale(setup.readYour() ?? {});
  } else if (v === null && !state.from && !state.size) {
    // Resetting a card-only measurement leaves nothing to draw: ask for the size again.
    skipRemember = true;
    drawer.close();
    startOver();
    openSetup('from');
  } else {
    state.cal = v;
    tuneTouched = true;
    update();
  }
});
// Made by initCalibrate above.
const calRemember = $('#cal-remember');
const calRememberRow = $('#cal-remember-row');
calRemember.addEventListener('change', () => { tuneTouched = true; });
initRender();

// Full screen and Drawing only: the toolbar and footer step aside. A floating Exit button is always
// there, and Esc leaves Drawing only (the browser handles Esc in full screen itself).
let drawingOnly = false;
let wasFullscreen = false;
function syncChrome() {
  const fs = Boolean(document.fullscreenElement);
  const toggled = fs !== wasFullscreen;
  wasFullscreen = fs;
  document.body.classList.toggle('is-fullscreen', fs);
  document.body.classList.toggle('is-drawing', drawingOnly);
  ui.drawingBtn.setAttribute('aria-pressed', String(drawingOnly));
  ui.exitView.hidden = !(fs || drawingOnly);
  ui.exitView.textContent = fs ? 'Exit full screen' : 'Exit drawing only';
  if (!fs && !drawingOnly) window.scrollTo(0, 0);
  // Whatever had focus (the toolbar button, or Exit) is hidden now: put focus on what is still there.
  // The page is a result only when it is shown; Start over moves focus itself.
  if (toggled && view === 'result') (fs || drawingOnly ? ui.exitView : ui.drawingBtn).focus();
}
function setDrawingOnly(on, { refocus = false } = {}) {
  drawingOnly = on;
  syncChrome();
  if (on) ui.exitView.focus();
  else if (refocus) ui.drawingBtn.focus();
}
document.addEventListener('fullscreenchange', syncChrome);
// Full screen is offered wherever the browser supports it (the stage card offers it too when the outline does not fit).
ui.fullscreenBtn.hidden = document.fullscreenEnabled !== true;
ui.fullscreenBtn.addEventListener('click', goFullscreen);
ui.drawingBtn.addEventListener('click', () => setDrawingOnly(true));
ui.exitView.addEventListener('click', () => {
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
  // Back to where you started: the screen remembered for this display, else the guess. Nothing is deleted.
  const home = homeScreen();
  source = home.source;
  Object.assign(state, ratioIfNeeded(home.you), { fill: false });
  state.to = suggestedTo(state);
  setView('start');
  window.scrollTo(0, 0);
  ui.startBtn.focus();
}
ui.startOverBtn.addEventListener('click', startOver);

setView(view);
update();
