/** Single-open accordion with an animated height. */
export function initAccordions() {
  document.querySelectorAll<HTMLElement>('[data-accordion]').forEach((root) => {
    const items = [...root.querySelectorAll<HTMLElement>('.accordion__item')];

    const set = (item: HTMLElement, open: boolean) => {
      const button = item.querySelector<HTMLButtonElement>('.accordion__toggle')!;
      const panel = item.querySelector<HTMLElement>('.accordion__panel')!;
      if ((button.getAttribute('aria-expanded') === 'true') === open) return;
      button.setAttribute('aria-expanded', String(open));
      item.toggleAttribute('data-open', open);
      panel.hidden = false;
      const full = panel.scrollHeight;
      const anim = panel.animate({ height: open ? ['0px', `${full}px`] : [`${full}px`, '0px'] }, { duration: 300, easing: 'ease' });
      anim.onfinish = () => {
        if (!open) panel.hidden = true;
      };
    };

    items.forEach((item) =>
      item.querySelector('.accordion__toggle')!.addEventListener('click', () => {
        const open = !item.hasAttribute('data-open');
        if (open) items.forEach((other) => other !== item && set(other, false));
        set(item, open);
      }),
    );
  });
}
