/**
 * Parallax for section backgrounds and images.
 *
 * Elements with `data-parallax='{"intensity":30,"rotation":90,"zoomStart":0,"zoomEnd":0}'`
 * contain a cover-fitted <img>. As the element travels through the viewport
 * (progress 0 → 1) the image is zoomed and drifts along `rotation` degrees:
 *
 *   amount = intensity / 200
 *   scale  = 1 / (1 - amount - lerp(zoomStart, zoomEnd, p) / 100)
 *   drift  = (cos θ, -sin θ) · amount · (p - 0.5) · scale      (fraction of the cover-fitted image)
 *
 * Progress eases toward its target (10% per frame) for a smooth, slightly lagging feel.
 */
interface Fx {
  intensity: number;
  rotation: number;
  zoomStart?: number;
  zoomEnd?: number;
}
interface Item {
  box: HTMLElement;
  img: HTMLImageElement;
  fx: Fx;
  progress: number;
  target: number;
  origin: [number, number];
}

const items: Item[] = [];
let raf = 0;

function measure(item: Item) {
  const r = item.box.getBoundingClientRect();
  const vh = window.innerHeight;
  item.target = Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1);
}

function apply(item: Item) {
  const { fx, progress: p, box, origin } = item;
  const amount = (fx.intensity * 0.01) / 2;
  const zoom = ((fx.zoomStart ?? 0) + ((fx.zoomEnd ?? 0) - (fx.zoomStart ?? 0)) * p) * 0.01;
  const scale = 1 / (1 - amount - zoom);
  const angle = (fx.rotation * Math.PI) / 180;
  const shift = amount * (p - 0.5) * scale;
  // drift is measured against the cover-fitted image, which can overflow the box
  const bw = box.clientWidth, bh = box.clientHeight;
  const ar = item.img.naturalWidth && item.img.naturalHeight ? item.img.naturalWidth / item.img.naturalHeight : bw / bh;
  const tx = Math.cos(angle) * shift * Math.max(bw, bh * ar);
  const ty = -Math.sin(angle) * shift * Math.max(bh, bw / ar);
  item.img.style.transformOrigin = `${origin[0] * 100}% ${origin[1] * 100}%`;
  item.img.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
}

function frame() {
  raf = 0;
  let moving = false;
  for (const item of items) {
    const d = item.target - item.progress;
    if (d === 0) continue;
    item.progress = Math.abs(d) < 0.01 ? item.target : item.progress + d * 0.1;
    apply(item);
    if (item.progress !== item.target) moving = true;
  }
  if (moving) raf = requestAnimationFrame(frame);
}

function update(immediate = false) {
  for (const item of items) {
    measure(item);
    if (immediate) {
      item.progress = item.target;
      apply(item);
    }
  }
  if (!raf) raf = requestAnimationFrame(frame);
}

export function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((box) => {
    const img = box.querySelector('img');
    if (!img) return;
    const [x, y] = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    const item: Item = { box, img, fx: JSON.parse(box.dataset.parallax || '{}'), progress: 0, target: 0, origin: [x || 0.5, y || 0.5] };
    items.push(item);
    if (!img.complete) img.addEventListener('load', () => apply(item), { once: true });
  });
  if (!items.length) return;
  update(true);
  window.addEventListener('scroll', () => update(), { passive: true });
  window.addEventListener('resize', () => update(true));
  new ResizeObserver(() => update(true)).observe(document.documentElement);
  // entering the viewport snaps straight to the current position, like the original
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const item = items.find((i) => i.box === e.target);
      if (item) {
        measure(item);
        item.progress = item.target;
        apply(item);
      }
    }
  });
  items.forEach((i) => io.observe(i.box));
}
