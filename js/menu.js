// The result toolbar's Options menu on small screens. From 768 px the options show inline and the
// button is hidden by CSS, so this only matters on phones and narrow windows. A plain disclosure
// (button + aria-expanded), closed by Esc, a click outside, or after any action in it.

const WIDE = '(min-width: 768px)';

export function initMenu(button, panel) {
  const wide = window.matchMedia(WIDE);
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  const set = (open) => {
    button.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('open', open);
  };
  const close = (refocus = false) => {
    if (!isOpen()) return;
    set(false);
    if (refocus) button.focus();
  };

  button.addEventListener('click', () => {
    set(!isOpen());
    if (isOpen()) panel.querySelector('button:not([hidden]), input')?.focus();
  });
  // Any button in the menu does its job and closes it; the Sample content switch keeps it open.
  panel.addEventListener('click', (e) => { if (!wide.matches && e.target.closest('button')) close(); });
  const onEsc = (e) => {
    if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); close(true); }
  };
  panel.addEventListener('keydown', onEsc);
  button.addEventListener('keydown', onEsc);
  document.addEventListener('pointerdown', (e) => {
    if (isOpen() && !panel.contains(e.target) && !button.contains(e.target)) close();
  });
  // Turning a phone or widening the window shows the options inline: nothing stays "open".
  wide.addEventListener('change', () => close());
  return { close };
}
