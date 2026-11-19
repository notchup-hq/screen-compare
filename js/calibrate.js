// Bank-card fine-tune: the user holds a card to the screen and drags the slider
// until the on-screen card matches. The result is stored in the URL (cal=px per mm).

import { BANK_CARD_MM } from './screens.js';

export function initCalibrate(onChange) {
  const body = document.getElementById('cal-body');
  body.innerHTML = `
    <p>Hold a bank card against the screen. Drag the slider until the card below is the same size as the real one. This replaces the size worked out from the screen you picked.</p>
    <div class="card-stage"><div class="card" id="cal-card" aria-hidden="true"></div></div>
    <label class="cal-slider">Card size
      <input type="range" id="cal-range" min="2" max="12" step="0.01">
    </label>
    <p><button type="button" id="cal-reset">Reset to calculated size</button></p>
    <p class="cal-note">Card: ${BANK_CARD_MM.width} × ${BANK_CARD_MM.height} mm (ISO/IEC 7810 ID-1).</p>`;

  const card = body.querySelector('#cal-card');
  const range = body.querySelector('#cal-range');

  range.addEventListener('input', () => onChange(Number(range.value)));
  body.querySelector('#cal-reset').addEventListener('click', () => onChange(null));

  document.addEventListener('compare', (e) => {
    const { scale } = e.detail;
    card.style.width = `${BANK_CARD_MM.width * scale}px`;
    card.style.height = `${BANK_CARD_MM.height * scale}px`;
    card.style.borderRadius = `${3.2 * scale}px`;
    range.value = scale;
    range.setAttribute('aria-valuetext', `Card drawn ${Math.round(BANK_CARD_MM.width * scale)} pixels wide`);
  });
}
