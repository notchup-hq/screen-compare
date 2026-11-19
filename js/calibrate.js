// Bank-card fine-tune: the user holds a card to the screen and drags the slider
// until the on-screen card matches. The result is stored in the URL (cal=px per mm).

import { BANK_CARD_MM } from './screens.js';
import { round1, yourScreen } from './scale.js';

const CARD_RADIUS_MM = 3.18; // ISO/IEC 7810 ID-1 corner radius

export function initCalibrate(onChange) {
  const body = document.getElementById('cal-body');
  body.innerHTML = `
    <p>This adjusts the scale so the outline is truly real size on this screen.</p>
    <p>Hold a bank card against the screen and drag the slider until the card below is the same size as the real one.</p>
    <div class="cal-row">
      <label class="cal-slider">Card size
        <input type="range" id="cal-range" min="2" max="10" step="0.01">
      </label>
      <button type="button" id="cal-reset">Reset fine-tune</button>
    </div>
    <p class="cal-size" id="cal-size"></p>
    <p class="cal-turn" id="cal-turn" hidden></p>
    <div class="card-stage"><div class="card" id="cal-card" aria-hidden="true"></div></div>
    <label class="remember" id="cal-remember-row"><input type="checkbox" id="cal-remember"> <span>Remember this screen on this browser</span></label>
    <p class="cal-note">Card: ${BANK_CARD_MM.width} × ${BANK_CARD_MM.height} mm (ISO/IEC 7810 ID-1).</p>`;

  const card = body.querySelector('#cal-card');
  const range = body.querySelector('#cal-range');
  const size = body.querySelector('#cal-size');
  const turn = body.querySelector('#cal-turn');
  const drawer = body.closest('dialog');

  range.addEventListener('input', () => onChange(Number(range.value)));
  const reset = body.querySelector('#cal-reset');
  reset.addEventListener('click', () => { onChange(null); range.focus(); });

  let drawnKey = '';
  document.addEventListener('compare', (e) => {
    const { scale, cal } = e.detail;
    // Sent on every update, resizes included: redraw the card only when its scale changed.
    const key = `${scale}|${cal}|${window.screen.width}|${window.devicePixelRatio}|${document.documentElement.clientWidth}`;
    if (key === drawnKey) return;
    drawnKey = key;
    reset.disabled = !cal;
    const fit = cardFit(scale, roomForCard(drawer));
    card.style.width = `${fit.width}px`;
    card.style.height = `${fit.height}px`;
    drawer?.style.setProperty('--card-w', `${Math.min(fit.width, fit.room)}px`);
    turn.hidden = fit.layout === 'flat';
    turn.textContent = fit.layout === 'upright'
      ? 'Hold the card upright: it fits this screen that way.'
      : fit.layout === 'cut' ? 'This screen is narrower than a card: hold it upright and match the top and bottom edges.' : '';
    card.style.borderRadius = `${CARD_RADIUS_MM * scale}px`;
    range.value = scale;
    // The screen size this card scale implies (the same maths as a card measurement everywhere else).
    const you = yourScreen({ cal: scale, css: { width: window.screen.width, height: window.screen.height }, dpr: window.devicePixelRatio || 1 });
    const inches = you ? round1(you.diagonalIn) : null;
    size.textContent = inches ? `Your screen is about ${inches}"` : '';
    range.setAttribute('aria-valuetext', `Card drawn ${Math.round(BANK_CARD_MM.width * scale)} pixels wide${inches ? `, your screen about ${inches} inches` : ''}`);
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
