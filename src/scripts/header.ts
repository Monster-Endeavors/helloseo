/**
 * Header behaviour:
 * - transparent at the top of the page, solid once scrolled
 * - hides while scrolling down, comes back when scrolling up
 * - desktop folder dropdowns open on hover / click / keyboard
 * - mobile burger opens a full-screen menu with sliding folder panels
 */
export function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  const setHeight = () =>
    document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
  new ResizeObserver(setHeight).observe(header);

  // --- scroll state ---------------------------------------------------------
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const h = header.offsetHeight;
    header.classList.toggle('is-solid', y > 0);
    if (y <= h) header.classList.remove('is-hidden');
    else if (y > lastY) header.classList.add('is-hidden');
    else if (y < lastY) header.classList.remove('is-hidden');
    lastY = y;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // --- desktop dropdowns ----------------------------------------------------
  header.querySelectorAll<HTMLButtonElement>('.nav-item__folder-title').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      header.querySelectorAll('.nav-item__folder-title').forEach((b) => b.setAttribute('aria-expanded', 'false'));
      btn.setAttribute('aria-expanded', String(!open));
    });
    btn.parentElement?.addEventListener('mouseleave', () => btn.setAttribute('aria-expanded', 'false'));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    header.querySelectorAll('.nav-item__folder-title').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (document.body.classList.contains('menu-open')) toggleMenu(false);
  });

  // --- mobile menu ----------------------------------------------------------
  const burger = header.querySelector<HTMLButtonElement>('.burger');
  const panels = header.querySelectorAll<HTMLElement>('.menu__panel');
  const root = header.querySelector<HTMLElement>('.menu__panel[data-panel="root"]');

  const showPanel = (name: string) => {
    panels.forEach((p) => p.classList.toggle('menu__panel--active', p.dataset.panel === name));
    root?.classList.toggle('is-behind', name !== 'root');
  };

  const toggleMenu = (open: boolean) => {
    document.body.classList.toggle('menu-open', open);
    burger?.setAttribute('aria-expanded', String(open));
    burger?.querySelector('[data-label-open]')?.toggleAttribute('hidden', open);
    burger?.querySelector('[data-label-close]')?.toggleAttribute('hidden', !open);
    if (!open) showPanel('root');
  };

  burger?.addEventListener('click', () => toggleMenu(!document.body.classList.contains('menu-open')));
  header.querySelectorAll<HTMLAnchorElement>('[data-open-panel]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showPanel(a.dataset.openPanel!);
    }),
  );
  header.querySelectorAll<HTMLAnchorElement>('[data-close-panel]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      showPanel('root');
    }),
  );
  window.matchMedia('(min-width: 800px)').addEventListener('change', (e) => {
    if (e.matches) toggleMenu(false);
  });
}
