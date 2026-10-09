/**
 * Cookie consent. Preferences live in localStorage under `cookie-consent` and are
 * passed to Google Analytics consent mode (analytics stays "denied" until accepted).
 */
type Prefs = { performance: boolean; marketing: boolean };
const KEY = 'cookie-consent';

export function readConsent(): Prefs | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

function apply(prefs: Prefs) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  w.gtag?.('consent', 'update', {
    analytics_storage: prefs.performance ? 'granted' : 'denied',
    ad_storage: prefs.marketing ? 'granted' : 'denied',
  });
}

function save(prefs: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable: the choice applies to this page view only */
  }
  apply(prefs);
}

export function initCookieBanner() {
  const root = document.querySelector<HTMLElement>('[data-cookies]');
  if (!root) return;
  const dialog = root.querySelector<HTMLElement>('[data-cookies-dialog]')!;
  const toggles = [...root.querySelectorAll<HTMLInputElement>('[data-cookie-category]')];

  const existing = readConsent();
  if (existing) {
    apply(existing);
    return;
  }
  root.hidden = false;

  const close = () => {
    root.hidden = true;
  };
  const syncLabels = () =>
    toggles.forEach((t) => {
      const state = t.parentElement?.querySelector('.cookie-toggle__state');
      if (state) state.textContent = t.checked ? 'On' : 'Off';
    });

  root.querySelector('[data-cookies-accept]')?.addEventListener('click', () => {
    save({ performance: true, marketing: true });
    close();
  });
  root.querySelector('[data-cookies-manage]')?.addEventListener('click', () => {
    dialog.hidden = false;
    dialog.querySelector<HTMLElement>('[data-cookies-close]')?.focus();
  });
  root.querySelector('[data-cookies-close]')?.addEventListener('click', () => (dialog.hidden = true));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.hidden = true;
  });
  toggles.forEach((t) => t.addEventListener('change', syncLabels));
  root.querySelector('[data-cookies-save]')?.addEventListener('click', () => {
    const prefs = Object.fromEntries(toggles.map((t) => [t.dataset.cookieCategory, t.checked])) as Prefs;
    save(prefs);
    close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dialog.hidden) dialog.hidden = true;
  });
}
