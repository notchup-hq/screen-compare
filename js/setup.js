// The setup dialog: two plain questions, one per step. Step 1 asks how big your screen is (a number
// of inches, or a laptop model it already knows, or a bank-card measurement). Step 2 asks which size
// you are thinking of: four big buttons that go straight to the result, and one link for any other
// size or a specific model. Everything technical lives in the Details drawer (js/details.js).
// Plain controls only; the page owns the state and gets the result through
// onApply({ cal | from | size/res/ratio, to, remember }).

import { resolveScreen } from './state.js';
import {
  groupedScreens, laptopModels, kindForDiagonal, otherChoice, STEP2_SIZES, SIZE_RATIO_CHOICES,
} from './compare-options.js';
import { SIZE_MAX_IN, SIZE_MIN_IN, round1, usableResolution, validSize } from './scale.js';
import { parseSize, sizeStepper } from './size-field.js';
import { rememberedLine } from './memory.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const $ = (root, sel) => root.querySelector(sel);
const RANGE_TEXT = `Use a size from ${SIZE_MIN_IN} to ${SIZE_MAX_IN} inches.`;

function optionList(select, groups, placeholder) {
  select.replaceChildren();
  const o = new Option(placeholder, '', true, true);
  o.disabled = true;
  select.append(o);
  for (const { group, screens } of groups) {
    const og = document.createElement('optgroup');
    og.label = group;
    for (const s of screens) og.append(new Option(s.name, s.id));
    select.append(og);
  }
}

/** One size button: its outline drawn to the same scale as the others, then the size. */
function sizeButton({ preset, label, name }, screen, scale, boxHeight) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'size-btn';
  b.dataset.spec = preset;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 100 ${boxHeight}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const w = screen.widthMm * scale;
  const h = screen.heightMm * scale;
  const r = document.createElementNS(SVG_NS, 'rect');
  r.setAttribute('x', ((100 - w) / 2).toFixed(1));
  r.setAttribute('y', ((boxHeight - h) / 2).toFixed(1));
  r.setAttribute('width', w.toFixed(1));
  r.setAttribute('height', h.toFixed(1));
  r.setAttribute('rx', '3');
  svg.append(r);

  const text = document.createElement('span');
  text.setAttribute('aria-hidden', 'true');
  text.textContent = label;
  const spoken = document.createElement('span');
  spoken.className = 'visually-hidden';
  spoken.textContent = name;
  b.append(svg, text, spoken);
  return b;
}

/**
 * @param {HTMLDialogElement} dialog
 * @param {object} deps
 * @param {(choice: object) => void} deps.onApply the visitor finished: { cal | from | size/res/ratio, to, remember }
 * @param {(draft: { your: object|null, cal: number|null }) => void} deps.onMeasure "Measure with a bank card" was pressed
 * @param {() => (object|null)} deps.onForget "Forget this screen": deletes the remembered screen and returns it, for Undo
 * @param {(profile: object) => boolean} deps.onRestore Undo: saves that screen again, true when it worked
 * @param {number[]|null} deps.native the screen's resolution as the browser reports it, [long, short], or null
 * @param {(your: object|null) => (number|null)} deps.diagonalOf the diagonal in inches of what readYour() returned
 */
export function createSetup(dialog, { onApply, onMeasure, onForget, onRestore, native, diagonalOf }) {
  const stepYou = $(dialog, '#step-you');
  const stepTo = $(dialog, '#step-to');
  const toH = $(dialog, '#to-h');
  const back = $(dialog, '#setup-back');
  const youKnown = $(dialog, '#you-known');
  const youAsk = $(dialog, '#you-ask');
  const knownText = $(dialog, '#known-text');
  const knownOk = $(dialog, '#known-ok');
  const knownChange = $(dialog, '#known-change');
  const sizeInput = $(dialog, '#size-input');
  const sizeError = $(dialog, '#size-error');
  const sizeNext = $(dialog, '#size-next');
  const modelBtn = $(dialog, '#model-btn');
  const modelWrap = $(dialog, '#model-wrap');
  const modelSelect = $(dialog, '#model-select');
  const cardBtn = $(dialog, '#card-btn');
  const rememberRow = $(dialog, '#remember-row');
  const rememberBox = $(dialog, '#remember');
  const knownRemembered = $(dialog, '#known-remembered');
  const knownForget = $(dialog, '#known-forget');
  const toast = $(dialog, '#setup-toast');
  const toastUndo = $(dialog, '#toast-undo');
  const sizes = $(dialog, '#to-sizes');
  const otherBtn = $(dialog, '#other-btn');
  const toOther = $(dialog, '#to-other');
  const otherSize = $(dialog, '#other-size');
  const syncSizeAria = sizeStepper(sizeInput, $(dialog, '#size-minus'), $(dialog, '#size-plus'), { start: 24 });
  const syncOtherAria = sizeStepper(otherSize, $(dialog, '#other-minus'), $(dialog, '#other-plus'), { start: 22 });
  const otherError = $(dialog, '#other-error');
  const toSelect = $(dialog, '#to-select');
  const showBtn = $(dialog, '#to-show');
  const sizeRow = otherSize.closest('.size-row');
  // Which of the two alternatives under "Other size" was changed last: 'size', 'model' or null.
  let otherActive = null;

  const nativeUsable = native && usableResolution(native[0], native[1]) ? native : null;
  const models = laptopModels();
  const modelIds = new Set(models.flatMap((g) => g.screens.map((s) => s.id)));
  optionList(modelSelect, models, 'Choose your laptop');
  optionList(toSelect, groupedScreens(), 'Choose a model…');

  // What the visitor has told us about their own screen. Only one is used, strongest first: a card
  // measurement (a draft until applied), a preset (a laptop model, or a generic one from the link that
  // is kept as it is), a typed size.
  let cal = null;
  let preset = null;
  let passRes = null; // a resolution edited in Details, passed through untouched
  let passRatio = null;
  let changing = false; // "No, change it" was pressed
  let step = 1;
  let kind = 'laptop';
  let currentTo = null;
  let canRemember = false; // storage works: offer "Remember this screen"
  let remembered = null; // { saved } while the first question shows a remembered screen to confirm
  let openedYour = {}; // what the dialog was opened with, to put back on Undo
  let forgotten = null; // the profile handed back by onForget, for Undo
  let toastTimer = 0;
  let keepCustom = null; // { size, spec }: a custom compared size shown under "Other size", kept as it is until edited

  const sizeValue = () => {
    const v = parseSize(sizeInput.value);
    return validSize(v) ? v : null;
  };

  // Next waits for a number; the placeholder is only a hint, never a value. Called whenever the field
  // can have changed, including from code (renderYou runs after every such change).
  function syncSize() {
    sizeNext.disabled = parseSize(sizeInput.value) == null;
    syncSizeAria();
  }

  function readYour() {
    if (cal) return { cal };
    if (preset) return { from: preset };
    const size = sizeValue();
    if (!size) return null;
    // Without a usable resolution the aspect ratio has to be assumed; Details can change it.
    const ratioNeeded = !nativeUsable && !passRes;
    return { size, res: passRes, ratio: ratioNeeded ? (passRatio ?? SIZE_RATIO_CHOICES[0].id) : null };
  }

  function showError(text) {
    sizeError.hidden = !text;
    sizeError.textContent = text;
    if (text) sizeInput.setAttribute('aria-invalid', 'true');
    else sizeInput.removeAttribute('aria-invalid');
  }

  // ---- Step 1: how big is your screen?
  function renderYou() {
    syncSize();
    const you = readYour();
    const isRemembered = Boolean(remembered && you);
    const known = isRemembered || Boolean(cal || (preset && modelIds.has(preset)));
    youKnown.hidden = !known;
    youAsk.hidden = known;
    knownRemembered.hidden = !isRemembered;
    knownForget.hidden = !isRemembered;
    knownChange.textContent = isRemembered ? 'Measure again' : 'No, change it';
    if (known) {
      const d = you ? diagonalOf(you) : null;
      const inches = d ? `${round1(d)}"` : '';
      if (isRemembered) {
        knownText.textContent = `Your screen: ${preset && modelIds.has(preset) ? resolveScreen(preset).short : inches}`;
        knownRemembered.textContent = rememberedLine(remembered.saved);
      } else {
        knownText.textContent = cal ? `Measured with a card${inches ? `: about ${inches}` : ''}` : resolveScreen(preset).short;
      }
    }
    // "Remember this screen" sits right under the main button; a remembered screen has its own links instead.
    rememberRow.hidden = !canRemember || isRemembered;
    (known ? knownOk : sizeNext).after(rememberRow);
    // One link at a time: the card at first, the model list after "No, change it".
    cardBtn.hidden = changing;
    modelBtn.hidden = !changing || !modelWrap.hidden;
  }

  function refocus() {
    if (step === 2) toH.focus();
    else (youKnown.hidden ? sizeInput : knownOk).focus();
  }

  function goStep(n) {
    step = n;
    stepYou.hidden = n !== 1;
    stepTo.hidden = n !== 2;
    back.hidden = n !== 2;
    dialog.setAttribute('aria-labelledby', n === 1 ? 'you-h' : 'to-h');
    if (n === 2) hideToast();
    if (n === 1) renderYou();
    else renderTo();
    refocus();
  }

  /** Put what the dialog was opened with into the first question: a card, a size or a model. */
  function seed(your) {
    forget();
    cal = your.cal ?? null;
    passRes = your.res ?? null;
    passRatio = your.ratio ?? null;
    sizeInput.value = '';
    showError('');
    if (!cal) {
      if (your.size) {
        sizeInput.value = your.size;
      } else if (your.from) {
        const s = resolveScreen(your.from);
        if (s) {
          preset = s.id;
          if (modelIds.has(s.id)) modelSelect.value = s.id;
          else sizeInput.value = s.diagonalIn; // a generic size: ask, prefilled
        }
      }
    }
  }

  function forget() {
    cal = null;
    preset = null;
    modelSelect.value = '';
  }

  sizeInput.addEventListener('input', () => {
    forget();
    showError('');
    syncSize();
  });
  sizeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (!sizeNext.disabled) sizeNext.click(); }
  });
  sizeNext.addEventListener('click', () => {
    if (!readYour()) {
      showError(RANGE_TEXT);
      sizeInput.focus();
      return;
    }
    goStep(2);
  });
  knownOk.addEventListener('click', () => goStep(2));
  knownChange.addEventListener('click', () => {
    if (remembered) {
      // "Measure again": the number field, prefilled with the size we have; the card link stays available.
      const d = diagonalOf(readYour() ?? {});
      remembered = null;
      forget();
      sizeInput.value = d ? String(round1(d)) : '';
      changing = false;
    } else {
      forget();
      sizeInput.value = '';
      changing = true;
    }
    renderYou();
    sizeInput.focus();
  });

  // "Forget this screen": the profile is deleted at once and the normal first question is shown, with a
  // short "Forgotten" note that offers Undo.
  function hideToast() {
    clearTimeout(toastTimer);
    toast.hidden = true;
    forgotten = null;
  }
  knownForget.addEventListener('click', () => {
    forgotten = onForget();
    remembered = null;
    forget();
    sizeInput.value = '';
    rememberBox.checked = false;
    changing = false;
    renderYou();
    sizeInput.focus();
    if (forgotten) {
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(hideToast, 5000);
    }
  });
  toastUndo.addEventListener('click', () => {
    const back = forgotten;
    hideToast();
    if (!back || !onRestore(back)) return;
    seed(openedYour);
    remembered = { saved: back.saved };
    rememberBox.checked = true;
    changing = false;
    renderYou();
    knownOk.focus();
  });
  modelBtn.addEventListener('click', () => {
    modelWrap.hidden = false;
    modelBtn.setAttribute('aria-expanded', 'true');
    modelSelect.focus();
    renderYou();
  });
  modelSelect.addEventListener('change', () => {
    const s = resolveScreen(modelSelect.value);
    if (!s) return;
    forget();
    preset = s.id;
    modelSelect.value = s.id;
    sizeInput.value = '';
    showError('');
    renderYou();
    refocus();
  });
  cardBtn.addEventListener('click', () => onMeasure({ your: readYour(), cal }));

  // ---- Step 2: which size are you thinking of?
  function renderSizes() {
    const items = STEP2_SIZES[kind].map((p) => ({ p, s: resolveScreen(p.preset) }));
    // One scale for all four outlines, so a bigger screen looks bigger.
    const scale = 92 / Math.max(...items.map(({ s }) => s.widthMm));
    const boxHeight = Math.ceil(Math.max(...items.map(({ s }) => s.heightMm)) * scale + 8);
    sizes.replaceChildren(...items.map(({ p, s }) => sizeButton(p, s, scale, boxHeight)));
    for (const b of sizes.children) {
      if (b.dataset.spec === currentTo) b.setAttribute('aria-current', 'true');
    }
  }

  function setOther(open) {
    toOther.hidden = !open;
    otherBtn.setAttribute('aria-expanded', String(open));
  }

  const otherNow = () => otherChoice({
    active: otherActive, sizeText: otherSize.value, modelId: toSelect.value, kind, keep: keepCustom,
  });

  // The alternative that is not used is dimmed (still focusable) and says why to screen readers.
  function dim(el, on, noteId, extra = '') {
    el.classList.toggle('unused', on);
    const ids = [extra, on ? noteId : ''].filter(Boolean).join(' ');
    if (ids) (el === sizeRow ? otherSize : el).setAttribute('aria-describedby', ids);
    else (el === sizeRow ? otherSize : el).removeAttribute('aria-describedby');
  }

  function syncOther() {
    syncOtherAria();
    const bad = otherSize.value !== '' && !validSize(parseSize(otherSize.value));
    otherError.hidden = !bad;
    otherError.textContent = bad ? RANGE_TEXT : '';
    const c = otherNow();
    dim(sizeRow, c.use === 'model', 'other-unused-size', 'other-error');
    dim(toSelect, c.use === 'size', 'other-unused-model');
    showBtn.disabled = !c.spec;
    showBtn.textContent = c.label;
    showBtn.title = c.label;
  }

  function renderTo() {
    kind = kindForDiagonal(diagonalOf(readYour()));
    renderSizes();
    otherSize.value = '';
    toSelect.value = '';
    keepCustom = null;
    // Something chosen before that is not one of the four buttons: show it under "Other size".
    const target = currentTo && resolveScreen(currentTo);
    const onButton = STEP2_SIZES[kind].some((p) => p.preset === currentTo);
    setOther(Boolean(target && !onButton));
    if (target && !onButton) {
      if (target.custom) {
        otherSize.value = target.diagonalIn;
        keepCustom = { size: parseSize(otherSize.value), spec: currentTo };
      }
      else toSelect.value = currentTo;
    }
    otherActive = otherSize.value !== '' ? 'size' : toSelect.value ? 'model' : null;
    syncOther();
  }

  function apply(to) {
    const your = readYour();
    if (!your || !to) return;
    dialog.close();
    // remember: true or false from the checkbox, null when storage is not available.
    onApply({ ...your, to, remember: canRemember ? rememberBox.checked : null });
  }

  sizes.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-spec]');
    if (b) apply(b.dataset.spec);
  });
  otherBtn.addEventListener('click', () => {
    const open = toOther.hidden;
    setOther(open);
    if (open) otherSize.focus();
  });
  otherSize.addEventListener('input', () => {
    otherActive = 'size';
    syncOther();
  });
  otherSize.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !showBtn.disabled) { e.preventDefault(); showBtn.click(); }
  });
  toSelect.addEventListener('change', () => {
    otherActive = 'model';
    syncOther();
  });
  showBtn.addEventListener('click', () => apply(otherNow().spec));
  back.addEventListener('click', () => goStep(1));

  $(dialog, '#setup-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', hideToast);
  // A click on the backdrop (the dialog element itself, outside its content) closes it.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  return {
    isOpen: () => dialog.open,
    readYour,
    refocus,
    /** The card drawer moved the slider (or reset it): the new measurement is a draft until applied. */
    setCal(v) {
      forget();
      cal = v ?? null;
      if (v) {
        sizeInput.value = '';
        showError('');
      }
      if (step === 1) renderYou();
    },
    /**
     * Open with the current choices.
     * `your` = { cal, from, size, res, ratio }, all optional; `to` is the compared screen now, if any;
     * `focus` is 'to' to start at the second question (your screen is already known), else 'from'.
     * `remember` = { checked } offers "Remember this screen" (null: storage is blocked, no offer);
     * `profile` = { saved } when your screen came from a remembered one: the first question shows it
     * ("Your screen: 26.9"", when it was remembered) with That's right, Measure again and Forget this screen.
     */
    open({ your = {}, to = null, focus = 'from', remember = null, profile = null }) {
      canRemember = Boolean(remember);
      rememberBox.checked = Boolean(remember?.checked);
      hideToast();
      openedYour = your;
      seed(your);
      changing = false;
      currentTo = resolveScreen(to) ? to : null;
      modelWrap.hidden = true;
      modelBtn.setAttribute('aria-expanded', 'false');
      remembered = profile && readYour() ? profile : null;
      dialog.showModal();
      goStep(focus === 'to' && readYour() ? 2 : 1);
    },
  };
}
