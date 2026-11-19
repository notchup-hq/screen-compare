// Fine-tune: the user holds a card or a ruler to the screen and drags the slider until the one drawn
// on screen matches. The result is stored in the URL (cal=px per mm).

import { BANK_CARD_MM } from './screens.js';
import { round1, yourScreen } from './scale.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CARD_RADIUS_MM = 3.18; // ISO/IEC 7810 ID-1 corner radius

/** Ruler scales: the unit in mm, how many units to draw (longest that fits first), ticks per unit. */
const RULERS = {
  cm: { unitMm: 10, counts: [10, 5, 3], ticks: 10, name: 'cm' },
  in: { unitMm: 25.4, counts: [4, 2, 1], ticks: 8, name: 'inches' },
};

const HOW = {
  card: 'Hold a card against the screen and drag the slider until the card below is the same size as the real one.',
  ruler: 'Hold a ruler against the screen with its 0 on the left end of the scale below, and drag the slider until the marks line up.',
};

export function initCalibrate(onChange) {
  const body = document.getElementById('cal-body');
  body.innerHTML = `
    <p>This adjusts the scale so the outline is truly real size on this screen.</p>
    <fieldset class="cal-with">
      <legend>Match with</legend>
      <label><input type="radio" name="cal-with" value="card" checked> A card</label>
      <label><input type="radio" name="cal-with" value="cm"> A ruler in cm</label>
      <label><input type="radio" name="cal-with" value="in"> A ruler in inches</label>
    </fieldset>
    <p id="cal-how"></p>
    <div class="cal-row">
      <label class="cal-slider">Scale
        <input type="range" id="cal-range" min="2" max="10" step="0.01">
      </label>
      <button type="button" id="cal-reset">Reset fine-tune</button>
    </div>
    <p class="cal-size" id="cal-size"></p>
    <p class="cal-turn" id="cal-turn" hidden></p>
    <div class="card-stage">
      <div class="card" id="cal-card" aria-hidden="true"></div>
      <svg class="ruler" id="cal-ruler" aria-hidden="true" focusable="false" hidden></svg>
    </div>
    <label class="remember" id="cal-remember-row"><input type="checkbox" id="cal-remember"> <span>Remember this screen on this browser</span></label>
    <p class="cal-note" id="cal-note">Any bank, ID, driving licence, loyalty or library card works: they are all ${BANK_CARD_MM.width} × ${BANK_CARD_MM.height} mm (ISO/IEC 7810 ID-1).</p>`;

  const card = body.querySelector('#cal-card');
  const ruler = body.querySelector('#cal-ruler');
  const how = body.querySelector('#cal-how');
  const note = body.querySelector('#cal-note');
  const range = body.querySelector('#cal-range');
  const size = body.querySelector('#cal-size');
  const turn = body.querySelector('#cal-turn');
  const drawer = body.closest('dialog');

  range.addEventListener('input', () => onChange(Number(range.value)));
  const reset = body.querySelector('#cal-reset');
  reset.addEventListener('click', () => { onChange(null); range.focus(); });

  let mode = 'card';
  let last = null; // { scale, cal } of the latest comparison
  let drawnKey = '';

  function draw() {
    if (!last) return;
    const { scale, cal } = last;
    // Sent on every update, resizes included: redraw only when something that shows changed.
    const key = `${mode}|${scale}|${cal}|${window.screen.width}|${window.devicePixelRatio}|${document.documentElement.clientWidth}`;
    if (key === drawnKey) return;
    drawnKey = key;
    reset.disabled = !cal;
    range.value = scale;
    const room = roomForCard(drawer);
    const isCard = mode === 'card';
    card.hidden = !isCard;
    ruler.toggleAttribute('hidden', isCard); // an <svg> has no hidden property
    note.hidden = !isCard;
    how.textContent = isCard ? HOW.card : HOW.ruler;
    let drawn;
    if (isCard) {
      const fit = cardFit(scale, room);
      card.style.width = `${fit.width}px`;
      card.style.height = `${fit.height}px`;
      card.style.borderRadius = `${CARD_RADIUS_MM * scale}px`;
      drawer?.style.setProperty('--card-w', `${Math.min(fit.width, fit.room)}px`);
      turn.hidden = fit.layout === 'flat';
      turn.textContent = fit.layout === 'upright'
        ? 'Hold the card upright: it fits this screen that way.'
        : fit.layout === 'cut' ? 'This screen is narrower than a card: hold it upright and match the top and bottom edges.' : '';
      drawn = `Card drawn ${Math.round(BANK_CARD_MM.width * scale)} pixels wide`;
    } else {
      const fit = rulerFit(scale, room, mode);
      drawRuler(ruler, scale, fit);
      drawer?.style.setProperty('--card-w', `${Math.min(fit.px + RULER_PAD * 2, room)}px`);
      turn.hidden = true;
      drawn = `${fit.count} ${RULERS[mode].name} drawn ${Math.round(fit.px)} pixels long`;
    }
    // The screen size this scale implies (the same maths as a card measurement everywhere else).
    const you = yourScreen({ cal: scale, css: { width: window.screen.width, height: window.screen.height }, dpr: window.devicePixelRatio || 1 });
    const inches = you ? round1(you.diagonalIn) : null;
    size.textContent = inches ? `Your screen is about ${inches}"` : '';
    range.setAttribute('aria-valuetext', `${drawn}${inches ? `, your screen about ${inches} inches` : ''}`);
  }

  body.querySelector('.cal-with').addEventListener('change', (e) => {
    mode = e.target.value;
    draw();
  });
  document.addEventListener('compare', (e) => {
    last = e.detail;
    draw();
  });
}

/** Room for the card: the window's width less the drawer's side padding and border. */
function roomForCard(drawer) {
  const width = document.documentElement.clientWidth;
  if (!drawer) return width;
  const cs = getComputedStyle(drawer);
  const sides = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'];
  return width - sides.reduce((sum, k) => sum + (parseFloat(cs[k]) || 0), 0);
}

/**
 * How to draw the card in `room` CSS px at `scale` px per mm: lying flat when it fits, upright when only
 * that fits, and upright but cut at the right edge when the screen is narrower than a card ('cut').
 * Exported for tests.
 */
export function cardFit(scale, room) {
  const long = BANK_CARD_MM.width * scale;
  const short = BANK_CARD_MM.height * scale;
  if (long <= room) return { layout: 'flat', width: long, height: short, room };
  return { layout: short <= room ? 'upright' : 'cut', width: short, height: long, room };
}

/** Space kept on each side of the ruler for its first and last number (px). */
const RULER_PAD = 8;

/**
 * The longest ruler that fits `room` CSS px at `scale` px per mm, in `unit` ('cm' or 'in'): 10, 5 or 3 cm,
 * or 4, 2 or 1 inches. Returns the number of units and the length in px. Exported for tests.
 */
export function rulerFit(scale, room, unit) {
  const r = RULERS[unit];
  const count = r.counts.find((n) => n * r.unitMm * scale + RULER_PAD * 2 <= room) ?? r.counts.at(-1);
  return { unit, count, px: count * r.unitMm * scale };
}

function svgEl(name, attrs) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** A ruler edge with ticks (mm, or eighths of an inch) and numbered whole units, true to `scale`. */
function drawRuler(svg, scale, { unit, count, px }) {
  const r = RULERS[unit];
  const step = (r.unitMm / r.ticks) * scale;
  const width = px + RULER_PAD * 2;
  svg.setAttribute('viewBox', `0 0 ${width} 48`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', '48');
  const parts = [svgEl('line', { x1: RULER_PAD, y1: 1, x2: RULER_PAD + px, y2: 1, class: 'ruler-edge' })];
  for (let i = 0; i <= count * r.ticks; i++) {
    const x = RULER_PAD + i * step;
    const whole = i % r.ticks === 0;
    const half = i % (r.ticks / 2) === 0;
    const h = whole ? 24 : half ? 16 : r.ticks === 8 && i % 2 === 0 ? 11 : 8;
    parts.push(svgEl('line', { x1: x, y1: 1, x2: x, y2: h, class: whole ? 'ruler-tick ruler-whole' : 'ruler-tick' }));
    if (whole) {
      // The last number carries the unit and ends at its tick, so it is never cut off on the right.
      const last = i === count * r.ticks;
      const t = svgEl('text', { x, y: 40, 'text-anchor': last ? 'end' : 'middle', class: 'ruler-num' });
      t.textContent = last ? `${count} ${unit}` : String(i / r.ticks);
      parts.push(t);
    }
  }
  svg.replaceChildren(...parts);
}
