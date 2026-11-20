// The footer's two settings: light or dark, and English or Finnish. Both start from the default (the
// system's colour scheme; English) and are remembered only when the visitor picks something else, so
// picking the default again forgets the setting (js/memory.js holds them).

import { getLang, localize, setLang, t } from './i18n.js';

const DARK = '(prefers-color-scheme: dark)';

/**
 * @param {{ themeBtn: HTMLButtonElement, langBtns: HTMLButtonElement[], prefs: { read: Function, set: Function } }} ui
 *   langBtns carry the language in `data-lang`.
 */
export function initSettings({ themeBtn, langBtns, prefs }) {
  const root = document.documentElement;
  const system = window.matchMedia(DARK);
  const saved = prefs.read();
  const title = document.title;

  const isDark = () => (root.dataset.theme ?? (system.matches ? 'dark' : 'light')) === 'dark';
  function syncTheme() {
    // The button says what it does: from a light page it goes dark, from a dark page light.
    const label = isDark() ? t('Light mode') : t('Dark mode');
    themeBtn.setAttribute('aria-label', label);
    themeBtn.title = label;
    themeBtn.dataset.mode = isDark() ? 'dark' : 'light';
  }
  function setTheme(theme) {
    if (theme) root.dataset.theme = theme;
    else delete root.dataset.theme;
    syncTheme();
  }
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    const same = next === (system.matches ? 'dark' : 'light');
    // Back to what the system asks for: follow the system again, and forget the setting.
    setTheme(same ? null : next);
    prefs.set({ theme: same ? null : next });
  });
  system.addEventListener('change', syncTheme);

  function syncLang() {
    root.lang = getLang();
    document.title = t(title);
    for (const b of langBtns) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
    localize(document.body);
    syncTheme();
  }
  for (const b of langBtns) {
    b.addEventListener('click', () => {
      const lang = b.dataset.lang;
      prefs.set({ lang: lang === 'en' ? null : lang });
      setLang(lang);
      syncLang();
      b.focus();
    });
  }

  setTheme(saved.theme ?? null);
  setLang(saved.lang ?? 'en');
  syncLang();
}
