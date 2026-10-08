/**
 * Infinite testimonial carousel. Slides are absolutely positioned with
 * transforms; prev/next shift the strip by one slide and wrap around, and the
 * strip can also be dragged/swiped.
 */
export function initCarousels() {
  document.querySelectorAll<HTMLElement>('[data-carousel]').forEach(setup);
}

function setup(root: HTMLElement) {
  const list = root.querySelector<HTMLElement>('.carousel__slides')!;
  const slides = [...list.querySelectorAll<HTMLElement>('.carousel__slide')];
  const n = slides.length;
  let index = 0;

  const step = () => {
    const first = slides[0];
    const gap = parseFloat(getComputedStyle(list).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  };

  // Place every slide relative to the current index, wrapping so there is
  // always one slide waiting on the left and the rest queued on the right.
  const layout = (animate: boolean) => {
    const w = step();
    slides.forEach((slide, i) => {
      let pos = (((i - index) % n) + n) % n;
      if (pos === n - 1) pos = -1;
      const prev = Number(slide.dataset.pos ?? pos);
      // Don't animate slides that jump from one end to the other.
      const jump = Math.abs(prev - pos) > 1;
      slide.style.transition = animate && !jump ? '' : 'none';
      slide.style.transform = `translate3d(${pos * w}px, 0, 0)`;
      slide.dataset.pos = String(pos);
    });
  };

  const go = (dir: number) => {
    index = (index + dir + n) % n;
    layout(true);
  };

  root.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.dir))));

  // drag / swipe
  let startX: number | null = null;
  const viewport = root.querySelector<HTMLElement>('.carousel__gutter')!;
  viewport.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
  });
  window.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  });

  layout(false);
  list.classList.add('is-ready');
  new ResizeObserver(() => layout(false)).observe(list);
}
