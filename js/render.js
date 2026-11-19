// Drawing: true-size stage, edge overflow, scaled overview, sample content.

import { fitsInside, formatCm, overflowPerSide } from './geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Default scaled "looks like" size in px for a screen; custom screens assume ~120 px per inch. */
function looksLike(screen) {
  if (screen.looksLike) return screen.looksLike;
  const w = Math.round((screen.widthMm / 25.4) * 120);
  return [w, Math.round(w / screen.ratio)];
}

/** Mock desktop laid out at the screen's default scaling, so text sizes are realistic. */
function sampleDesktop(screen, pxPerMm) {
  const [lw, lh] = looksLike(screen);
  const k = (screen.widthMm * pxPerMm) / lw;
  const el = document.createElement('div');
  el.className = 'desktop';
  el.style.width = `${lw}px`;
  el.style.height = `${lh}px`;
  el.style.transform = `scale(${k})`;
  el.innerHTML = `
    <div class="d-menubar"><b>Files</b><span>Edit</span><span>View</span><span>Window</span><span class="d-grow"></span><span>Tue 9:41</span></div>
    <div class="d-window">
      <div class="d-side"><p>Favourites</p><p>Documents</p><p>Downloads</p><p>Projects</p><p>Archive</p></div>
      <div class="d-main">
        <h3>Quarterly notes</h3>
        <p>Text and controls are drawn at ${lw} × ${lh} points, the default scaling for this screen. The more of this you can read comfortably, the more room you have to work.</p>
        <p>Resize the comparison to see how many lines of a document fit before you have to scroll, and how wide a window can be before it feels crowded.</p>
        <p>This is only a sample: real apps add toolbars and sidebars that use even more of the space.</p>
      </div>
    </div>`;
  return el;
}

function labelFor(mm) {
  return mm >= 0 ? `${formatCm(mm)} beyond this edge` : `${formatCm(-mm)} inside this edge`;
}

function renderStage(from, to, scale, fill) {
  const stage = document.getElementById('stage');
  stage.replaceChildren();
  stage.classList.toggle('is-fill', fill);
  stage.style.setProperty('--cm', `${scale * 10}px`);
  const fits = fitsInside(to, from);

  const box = (screen, cls) => {
    const el = document.createElement('div');
    el.className = cls;
    el.style.width = `${screen.widthMm * scale}px`;
    el.style.height = `${screen.heightMm * scale}px`;
    return el;
  };

  {
    const target = box(to, 'outline target');
    if (fill) target.append(sampleDesktop(to, scale));
    const caption = document.createElement('span');
    caption.className = 'caption';
    caption.textContent = `${to.name}, true size`;
    target.append(caption);
    stage.append(target);
  }

  if (!fits) {
    const o = overflowPerSide(to, from);
    const edges = box(from, 'outline edges');
    edges.innerHTML = `
      <span class="edge e-top">${labelFor(o.topMm)}</span>
      <span class="edge e-left">${labelFor(o.sideMm)}</span>
      <span class="edge e-right">${labelFor(o.sideMm)}</span>
      <span class="edge e-bottom">${labelFor(o.topMm)}</span>`;
    stage.append(edges);
  }
}

/** Both screens drawn to scale, nested and centred, so the size jump is easy to see. */
function renderOverview(from, to) {
  const host = document.getElementById('overview');
  const pad = 12;
  const maxW = 300;
  const w = Math.max(from.widthMm, to.widthMm);
  const h = Math.max(from.heightMm, to.heightMm);
  const k = Math.min((maxW - pad * 2) / w, 160 / h);
  const W = w * k + pad * 2;
  const H = h * k + pad * 2;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Both screens to scale, centred: your screen ${formatCm(from.widthMm)} wide and ${to.name} ${formatCm(to.widthMm)} wide.`);

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

  const caption = document.createElement('p');
  caption.className = 'legend';
  caption.innerHTML = '<span class="key key-from"></span>Your screen <span class="key key-to"></span>Compared screen (both to scale)';
  host.replaceChildren(svg, caption);
}

export function initRender() {
  document.addEventListener('compare', (e) => {
    const { from, to, scale, state } = e.detail;
    renderStage(from, to, scale, state.fill);
    renderOverview(from, to);
  });
}
