/** Count stats up from zero (ease-out cubic) once half of the list is visible. */
export function initCounters() {
  document.querySelectorAll<HTMLElement>('[data-stats]').forEach((list) => {
    const duration = Number(list.dataset.duration) || 8000;
    const values = [...list.querySelectorAll<HTMLElement>('[data-value]')];
    const format = (el: HTMLElement, v: number) => {
      const sep = el.dataset.separator;
      const s = sep && v >= 1000 ? v.toLocaleString('en-US').replace(/,/g, sep) : String(v);
      return s + (el.dataset.suffix ?? '');
    };
    values.forEach((el) => (el.textContent = format(el, 0)));
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.intersectionRatio >= 0.5)) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          values.forEach((el) => (el.textContent = format(el, Math.floor(eased * Number(el.dataset.value)))));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(list.closest('section') ?? list);
  });
}
