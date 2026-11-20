// Drawing: the true-size outline, its edge labels and chip, your screen's edges for a
// bigger target, the "not enough room" card, the scaled overview and sample content.
//
// The outline is never drawn overflowing: when it does not fit the free space the stage
// shows a card that offers Full screen instead.

import { fitsBox, fitsInside, overflowPerSide } from './geometry.js';
import { sizeLabel } from './suggest.js';
import { cm, getLang, num, screenName, t } from './i18n.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Space kept free around the outline for its centimetre labels (px). */
const MARGIN = 28;

/** Default scaled "looks like" size in px for a screen; custom screens assume ~120 px per inch. */
function looksLike(screen) {
  if (screen.looksLike) return screen.looksLike;
  const w = Math.round((screen.widthMm / 25.4) * 120);
  return [w, Math.round(w / screen.ratio)];
}

/** Mock desktop at the screen's default scaling, so text sizes are realistic: a document and a window. */
function sampleDesktop(screen, pxPerMm) {
  const [lw, lh] = looksLike(screen);
  const k = (screen.widthMm * pxPerMm) / lw;
  const el = document.createElement('div');
  el.className = 'desktop';
  el.style.width = `${lw}px`;
  el.style.height = `${lh}px`;
  el.style.transform = `scale(${k})`;
  el.innerHTML = `
    <div class="d-menubar"><b>${t('Files')}</b><span>${t('Edit')}</span><span>${t('View')}</span><span>${t('Window')}</span><span class="d-grow"></span><span>${t('Tue 9:41')}</span></div>
    <div class="d-win d-doc">
      <div class="d-title">${t('Quarterly notes')}</div>
      <div class="d-body">
        <h3>${t('Quarterly notes')}</h3>
        <p>${t('Text and controls are drawn at {w} × {h} points, the default scaling for this screen. The more of this you can read comfortably, the more room you have to work.', { w: lw, h: lh })}</p>
        <p>${t('Resize the comparison to see how many lines of a document fit before you have to scroll, and how wide a window can be before it feels crowded.')}</p>
        <p>${t('This is only a sample: real apps add toolbars and sidebars that use even more of the space.')}</p>
      </div>
    </div>
    <div class="d-win d-web">
      <div class="d-title">${t('Planning board')}</div>
      <div class="d-body">
        <div class="d-tabs"><span class="on">${t('Overview')}</span><span>${t('Schedule')}</span><span>${t('Budget')}</span></div>
        <p class="d-bar" style="width: 80%"></p><p class="d-bar" style="width: 64%"></p><p class="d-bar" style="width: 72%"></p>
        <div class="d-chart"><i style="height: 40%"></i><i style="height: 65%"></i><i style="height: 50%"></i><i style="height: 85%"></i><i style="height: 60%"></i></div>
      </div>
    </div>`;
  return el;
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** A dimension line: ticks at both ends with the length between them. */
function dimension(className, text) {
  const d = el('span', `dim ${className}`);
  d.append(el('i'), el('b', '', text), el('i'));
  return d;
}

/** "1.9 cm past each side", "0.4 cm short of each side", or '' when the sizes match. */
function reach(mm, past, short) {
  if (Math.abs(mm) < 1) return '';
  return mm > 0 ? past({ len: cm(mm) }) : short({ len: cm(-mm) });
}

function reachSentence(to, from) {
  const o = overflowPerSide(to, from);
  const parts = [
    reach(o.sideMm, (v) => t('{len} past each side', v), (v) => t('{len} short of each side', v)),
    reach(o.topMm, (v) => t('{len} past the top and bottom', v), (v) => t('{len} short of the top and bottom', v)),
  ].filter(Boolean);
  return parts.length ? t('reaches {parts}', { parts: parts.join(t(' and ')) }) : t('is the same size as your screen');
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let last; // the latest draw() arguments, so a resize can redraw
let lastScreens; // "from>to" of the previous drawing, to fade in only when the compared screens change
let lastDrawn = ''; // everything the last drawing depended on: an identical redraw is skipped
let lastLive = '';

function chipText(from, to, pct) {
  return pct === 100 && Math.abs(to.widthMm - from.widthMm) < 1 && Math.abs(to.heightMm - from.heightMm) < 1
    ? t('{size} is the same size as your screen', { size: num(sizeLabel(to)) })
    : t("{size} is {pct} % of your screen's area", { size: num(sizeLabel(to)), pct });
}

/** The area chip with the accuracy line under it. "Check with a card" whenever the size is not measured with one. */
function chipStack(from, to, pct, { accuracy, accuracyLabel, onCheckCard }) {
  const stack = el('div', 'chip-stack');
  const chip = el('p', 'chip', chipText(from, to, pct));
  chip.setAttribute('aria-hidden', 'true');
  const line = el('p', `accuracy acc-${accuracy}`);
  line.append(el('span', '', accuracyLabel));
  if (accuracy !== 'card') {
    const b = el('button', 'link-btn', t('Check with a card'));
    b.type = 'button';
    b.addEventListener('click', onCheckCard);
    line.append(' ', b);
  }
  // Names both screens where the toolbar that normally does is hidden (full screen, Drawing only; see the CSS).
  const context = el('p', 'chip-context', t('{to} vs {from}', { to: screenName(to), from: screenName(from) }));
  context.setAttribute('aria-hidden', 'true');
  stack.append(chip, context, line);
  return stack;
}

function card({ title, text, from, to, canFullscreen, onFullscreen, inFullscreen }) {
  const c = el('section', 'fit-card');
  const id = 'fit-h';
  c.setAttribute('aria-labelledby', id);
  const h = el('h2', '', title);
  h.id = id;
  c.append(h, el('p', '', text));
  const ov = el('div', 'overview');
  renderOverview(ov, from, to);
  c.append(ov);
  if (!inFullscreen) {
    if (canFullscreen) {
      const b = el('button', 'primary', t('Full screen'));
      b.type = 'button';
      b.addEventListener('click', onFullscreen);
      c.append(b);
    } else {
      c.append(el('p', 'note', t('This browser cannot go full screen. Make the window as large as you can, or use a bigger screen.')));
    }
  }
  return c;
}

/** Draw (or redraw) the stage. `args` = { from, to, scale, fill, pct, accuracy, accuracyLabel, onCheckCard, canFullscreen, onFullscreen }. */
export function draw(args) {
  last = args;
  const stage = document.getElementById('stage');
  const { from, to, scale, fill, pct } = args;
  const sw = stage.clientWidth;
  const sh = stage.clientHeight;
  if (!sw || !sh) return; // not visible yet
  const full = Boolean(document.fullscreenElement);
  // The ResizeObserver, a window resize and every state change all end up here, often with nothing new
  // to show: do the work (a full rebuild of the stage) only when something it draws has changed.
  const drawn = JSON.stringify([
    from.id, from.widthMm, from.heightMm, to.id, to.widthMm, to.heightMm, scale, fill, pct,
    args.accuracy, args.accuracyLabel, args.canFullscreen, sw, sh, full, getLang(),
  ]);
  if (drawn === lastDrawn && stage.firstElementChild) return;
  lastDrawn = drawn;

  const fits = fitsInside(to, from);
  const tw = to.widthMm * scale;
  const th = to.heightMm * scale;
  const screens = `${from.id}>${to.id}`;
  const changed = lastScreens !== undefined && screens !== lastScreens;
  lastScreens = screens;

  const live = chipText(from, to, pct) + (fits ? '' : t(', and it {reach}', { reach: reachSentence(to, from) }));
  const liveEl = document.getElementById('live');
  if (live !== lastLive) { lastLive = live; liveEl.textContent = live; }

  const roomy = fitsBox(tw, th, sw, sh, MARGIN);
  const tight = !roomy && fitsBox(tw, th, sw, sh, 0); // fits, but the labels go inside it
  const cardArgs = { from, to, canFullscreen: args.canFullscreen, onFullscreen: args.onFullscreen, inFullscreen: full };

  stage.replaceChildren();
  stage.className = 'stage';

  if (!fits && !full) {
    // Your own screen's edges only show when the window is the whole screen.
    stage.append(card({
      ...cardArgs,
      title: t('Bigger than your screen'),
      text: t("At true size {size} {reach}. Full screen shows your screen's edges and how far it goes.", { size: num(sizeLabel(to)), reach: reachSentence(to, from) }),
    }));
    return;
  }
  if (!fits) {
    drawEdges(stage, from, to, tw, th, fill, scale, pct, args);
    return;
  }
  if (!roomy && !tight) {
    // scale is px per mm, so px / scale is mm
    const free = `${cm((sw - MARGIN * 2) / scale)} × ${cm((sh - MARGIN * 2) / scale)}`;
    stage.append(card({
      ...cardArgs,
      title: t('Not enough room in this window'),
      text: t('At true size it needs {need}. This window has room for about {free}.', { need: `${cm(to.widthMm)} × ${cm(to.heightMm)}`, free }),
    }));
    return;
  }

  // The outline: width on the top edge, height on the left edge, one chip at the bottom.
  const frame = el('div', `frame${tight ? ' tight' : ''}${changed && !reduced() ? ' fade-in' : ''}`);
  frame.style.width = `${tw}px`;
  frame.style.height = `${th}px`;
  const outline = el('div', 'outline target');
  if (fill) outline.append(sampleDesktop(to, scale));
  frame.append(outline, dimension('dim-w', cm(to.widthMm)), dimension('dim-h', cm(to.heightMm)), chipStack(from, to, pct, args));
  stage.append(frame);
}

/** Full screen and the target is bigger: the stage is your screen; say how far the target reaches past each edge. */
function drawEdges(stage, from, to, tw, th, fill, scale, pct, args) {
  stage.classList.add('is-edges');
  const o = overflowPerSide(to, from);
  const outline = el('div', 'outline target');
  outline.style.width = `${tw}px`;
  outline.style.height = `${th}px`;
  if (fill) outline.append(sampleDesktop(to, scale));
  const label = (cls, mm) => el('span', `edge ${cls}`, mm > 0 ? t('reaches {len} past this edge', { len: cm(mm) }) : t('{len} inside this edge', { len: cm(Math.abs(mm)) }));
  stage.append(
    outline,
    label('e-top', o.topMm), label('e-bottom', o.topMm), label('e-left', o.sideMm), label('e-right', o.sideMm),
    chipStack(from, to, pct, args),
  );
}

/** Both screens drawn to scale, nested and centred, so the size jump is easy to see. */
export function renderOverview(host, from, to) {
  const pad = 12;
  const maxW = 300;
  const w = Math.max(from.widthMm, to.widthMm);
  const h = Math.max(from.heightMm, to.heightMm);
  const k = Math.min((maxW - pad * 2) / w, 160 / h);
  const W = w * k + pad * 2;
  const H = h * k + pad * 2;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  // Its own size, not the card's width: a tall pair of phones would otherwise grow past the window.
  svg.setAttribute('width', Math.round(W));
  svg.setAttribute('height', Math.round(H));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t('Both screens to scale, centred: your screen {from} wide and {name} {to} wide.', { from: cm(from.widthMm), name: screenName(to), to: cm(to.widthMm) }));

  const rect = (screen, cls) => {
    const r = document.createElementNS(SVG_NS, 'rect');
    const rw = screen.widthMm * k;
    const rh = screen.heightMm * k;
    r.setAttribute('x', (W - rw) / 2);
    r.setAttribute('y', (H - rh) / 2);
    r.setAttribute('width', rw);
    r.setAttribute('height', rh);
    r.setAttribute('rx', 3);
    r.setAttribute('class', cls);
    return r;
  };

  const bigger = to.widthMm * to.heightMm > from.widthMm * from.heightMm;
  svg.append(rect(bigger ? to : from, bigger ? 'ov-to' : 'ov-from'));
  svg.append(rect(bigger ? from : to, bigger ? 'ov-from' : 'ov-to'));

  const title = el('h4', 'ov-title', t('Scaled comparison (not real size)'));
  const caption = document.createElement('p');
  caption.className = 'legend';
  caption.append(el('span', 'key key-from'), `${t('Your screen')} `, el('span', 'key key-to'), t('Compared screen (same scale for both)'));
  host.replaceChildren(title, svg, caption);
}

export function initRender() {
  // The free space changes with the window and with full screen.
  const again = () => { if (last) draw(last); };
  if ('ResizeObserver' in window) new ResizeObserver(again).observe(document.getElementById('stage'));
  document.addEventListener('fullscreenchange', again);
}
