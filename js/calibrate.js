// Bank-card fine-tune: the user holds a card to the screen and drags the slider
// until the on-screen card matches. The result is stored in the URL (cal=px per mm).

import { BANK_CARD_MM } from './screens.js';
import { yourScreen } from './scale.js';

const CARD_RADIUS_MM = 3.18; // ISO/IEC 7810 ID-1 corner radius

export function initCalibrate(onChange) {
  const body = document.getElementById('cal-body');
  body.innerHTML = `
    <p>This adjusts the scale so the outline is truly real size on this screen.</p>
    <p>Hold a bank card against the screen and drag the slider until the card below is the same size as the real one.</p>
    <div class="card-stage"><div class="card" id="cal-card" aria-hidden="true"></div></div>
    <p class="cal-size" id="cal-size"></p>
    <div class="cal-row">
      <label class="cal-slider">Card size
        <input type="range" id="cal-range" min="2" max="10" step="0.01">
      </label>
      <button type="button" id="cal-reset">Reset fine-tune</button>
    </div>
    <p class="cal-note">Card: ${BANK_CARD_MM.width} × ${BANK_CARD_MM.height} mm (ISO/IEC 7810 ID-1).</p>`;

  const card = body.querySelector('#cal-card');
  const range = body.querySelector('#cal-range');
  const size = body.querySelector('#cal-size');

  range.addEventListener('input', () => onChange(Number(range.value)));
  const reset = body.querySelector('#cal-reset');
  reset.addEventListener('click', () => { onChange(null); range.focus(); });

  document.addEventListener('compare', (e) => {
    const { scale, cal } = e.detail;
    reset.disabled = !cal;
    card.style.width = `${BANK_CARD_MM.width * scale}px`;
    card.style.height = `${BANK_CARD_MM.height * scale}px`;
    card.style.borderRadius = `${CARD_RADIUS_MM * scale}px`;
    range.value = scale;
    // The screen size this card scale implies (the same maths as a card measurement everywhere else).
    const you = yourScreen({ cal: scale, css: { width: window.screen.width, height: window.screen.height }, dpr: window.devicePixelRatio || 1 });
    const inches = you ? Math.round(you.diagonalIn * 10) / 10 : null;
    size.textContent = inches ? `Your screen is about ${inches}"` : '';
    range.setAttribute('aria-valuetext', `Card drawn ${Math.round(BANK_CARD_MM.width * scale)} pixels wide${inches ? `, your screen about ${inches} inches` : ''}`);
  });
}
