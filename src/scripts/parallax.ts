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
 * This mirrors the original WebGL shader, which samples the whole image texture.
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
  const { fx, progress: p, box, img, origin } = item;
  const amount = (fx.intensity * 0.01) / 2;
  const zoom = ((fx.zoomStart ?? 0) + ((fx.zoomEnd ?? 0) - (fx.zoomStart ?? 0)) * p) * 0.01;
  const scale = 1 / (1 - amount - zoom);
  const angle = (fx.rotation * Math.PI) / 180;
  const shift = amount * (p - 0.5) * scale;

  // Lay the image out at its full cover-fit size (like a texture, nothing cropped)
  // so zooming/drifting reveals real image rather than empty space.
  const bw = box.clientWidth, bh = box.clientHeight;
  const ar = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : bw / bh;
  const dw = Math.max(bw, bh * ar);
  const dh = Math.max(bh, bw / ar);
  Object.assign(img.style, {
    position: 'absolute',
    maxWidth: 'none',
    width: `${dw}px`,
    height: `${dh}px`,
    left: `${(bw - dw) * origin[0]}px`,
    top: `${(bh - dh) * origin[1]}px`,
    objectFit: 'fill',
    objectPosition: '50% 50%',
    // zoom around the focal point
    transformOrigin: `${origin[0] * 100}% ${origin[1] * 100}%`,
    transform: `translate3d(${(Math.cos(angle) * shift * dw).toFixed(2)}px, ${(-Math.sin(angle) * shift * dh).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`,
  });
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
    // focal point: from --fx/--fy (section backgrounds) or the image's object-position
    const cs = getComputedStyle(box);
    const fxVar = parseFloat(cs.getPropertyValue('--fx'));
    const fyVar = parseFloat(cs.getPropertyValue('--fy'));
    const [ox, oy] = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    const x = Number.isNaN(fxVar) ? ox : fxVar;
    const y = Number.isNaN(fyVar) ? oy : fyVar;
    const item: Item = { box, img, fx: JSON.parse(box.dataset.parallax || '{}'), progress: 0, target: 0, origin: [x || 0.5, y || 0.5] };
    items.push(item);
    if (!img.complete) img.addEventListener('load', () => apply(item), { once: true });
  });
  if (!items.length) return;
  update(true);
  window.addEventListener('scroll', () => update(), { passive: true });
  window.addEventListener('resize', () => update(true));
  const ro = new ResizeObserver(() => update(true));
  ro.observe(document.documentElement);
  items.forEach((i) => ro.observe(i.box));
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
