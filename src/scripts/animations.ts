/**
 * Site animations.
 *
 * 1. Reveal: text, buttons, images and list items fade/slide (or wipe) in the
 *    first time they enter the viewport. Targets are hidden by CSS while
 *    `html.js-anim` is set and revealed by adding `.is-revealed`.
 * 2. Block animations: blocks with a `data-anim` JSON config run one of
 *    `appear`, `hover`, `loop` or `scroll` effects.
 */

type Frame = { x?: string; y?: string; r?: number; sx?: number; sy?: number; o?: number };
type Anim = {
  trigger: 'appear' | 'hover' | 'loop' | 'scroll';
  duration: number;
  delay?: number;
  ease: string;
  bounce?: number;
  frames: Frame[];
};
type Config = { base?: Frame; origin?: string; animations?: Anim[] };

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EASE: Record<string, string> = {
  linear: 'linear',
  ease: 'ease',
  'ease-in': 'cubic-bezier(0.55, 0, 1, 0.45)',
  'ease-out': 'cubic-bezier(0, 0.55, 0.45, 1)',
  'ease-in-out': 'cubic-bezier(0.78, 0, 0.22, 1)',
  'ease-in-out-back': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
};

/** A damped spring sampled into a CSS linear() easing. */
function spring(bounce = 0.5): string {
  const zeta = 1 - Math.min(Math.max(bounce, 0), 0.95); // damping ratio
  const omega = 2 * Math.PI * 1.6;
  const pts: string[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    let v: number;
    if (zeta < 1) {
      const wd = omega * Math.sqrt(1 - zeta * zeta);
      v = 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
    } else {
      v = 1 - Math.exp(-omega * t) * (1 + omega * t);
    }
    pts.push((i === N ? 1 : v).toFixed(4));
  }
  return `linear(${pts.join(', ')})`;
}

const easing = (a: Anim) => (a.ease === 'spring' ? spring(a.bounce) : (EASE[a.ease] ?? 'ease'));

const transform = (f: Frame = {}) =>
  `translate3d(${f.x ?? '0px'}, ${f.y ?? '0px'}, 0) rotateZ(${f.r ?? 0}deg) scaleX(${f.sx ?? 1}) scaleY(${f.sy ?? 1})`;
const keyframe = (f: Frame = {}, base: Frame = {}) => ({
  transform: transform({ ...base, ...f }),
  opacity: String(f.o ?? base.o ?? 1),
});

function onEnter(el: Element, cb: () => void, rootMargin = '0px') {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          cb();
          io.disconnect();
        }
      }
    },
    { rootMargin },
  );
  io.observe(el);
}

// ---------------------------------------------------------------------------
// 1. Reveal
// ---------------------------------------------------------------------------
const REVEAL_SELECTOR = [
  '[data-reveal]',
  '.rte > p',
  '.rte > h1',
  '.rte > h2',
  '.rte > h3',
  '.rte > h4',
  '.list-title > p',
  '.list-item__desc > p',
].join(',');

function initReveal() {
  const targets = [...document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)];
  // Header elements reveal immediately with a tiny stagger.
  let headerIndex = 0;
  for (const el of targets) {
    if (el.dataset.reveal === 'header') {
      el.style.transitionDelay = `${(headerIndex++ * 0.0088).toFixed(4)}s`;
      requestAnimationFrame(() => el.classList.add('is-revealed'));
      continue;
    }
    onEnter(el, () => el.classList.add('is-revealed'));
  }
}

// ---------------------------------------------------------------------------
// 2. Block animations
// ---------------------------------------------------------------------------
function runAppear(el: HTMLElement, a: Anim, base: Frame) {
  const [from, to] = [a.frames[0], a.frames[a.frames.length - 1]];
  el.style.transform = transform({ ...base, ...from });
  onEnter(el, () => {
    el.animate([keyframe(from, base), keyframe(to, base)], {
      duration: a.duration * 1000,
      delay: (a.delay ?? 0) * 1000,
      easing: easing(a),
      fill: 'forwards',
    }).finished.then(() => (el.style.transform = transform({ ...base, ...to })));
  });
}

function runHover(el: HTMLElement, a: Anim, base: Frame) {
  const frames = [keyframe({}, base), ...a.frames.map((f) => keyframe(f, base))];
  const opts: KeyframeAnimationOptions = { duration: a.duration * 1000, easing: easing(a), fill: 'forwards' };
  let anim: Animation | null = null;
  el.addEventListener('mouseenter', () => {
    anim?.cancel();
    anim = el.animate(frames, opts);
  });
  el.addEventListener('mouseleave', () => {
    if (!anim) return;
    const current = getComputedStyle(el).transform;
    anim.cancel();
    anim = el.animate([{ transform: current }, keyframe({}, base)], opts);
  });
}

function runLoop(el: HTMLElement, a: Anim, base: Frame) {
  el.animate([keyframe({}, base), keyframe(a.frames[0], base)], {
    duration: a.duration * 1000,
    delay: (a.delay ?? 0) * 1000,
    easing: easing(a),
    iterations: Infinity,
    direction: 'alternate',
  });
}

/** Scroll-linked: progress runs from the block entering the viewport to its centre reaching the viewport centre. */
const scrollers: { el: HTMLElement; a: Anim; base: Frame; current: number }[] = [];
function runScroll(el: HTMLElement, a: Anim, base: Frame) {
  // Prefer a native view timeline (it also follows viewport resizes); fall back to a scroll listener.
  const ViewTimelineCtor = (window as unknown as { ViewTimeline?: new (o: { subject: Element }) => AnimationTimeline }).ViewTimeline;
  if (ViewTimelineCtor) {
    const [f0, f1] = [a.frames[0] ?? {}, a.frames[a.frames.length - 1] ?? {}];
    el.animate([keyframe(f0, base), keyframe(f1, base)], {
      timeline: new ViewTimelineCtor({ subject: el }),
      rangeStart: 'entry 0%',
      rangeEnd: 'cover 50%',
      easing: easing(a),
      fill: 'both',
    } as KeyframeAnimationOptions);
    return;
  }
  scrollers.push({ el, a, base, current: -1 });
}
function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const bx = (t: number) => 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
  const by = (t: number) => 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
  return (x: number) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 30; i++) {
      t = (lo + hi) / 2;
      if (bx(t) < x) lo = t;
      else hi = t;
    }
    return by(t);
  };
}
const backInOut = cubicBezier(0.68, -0.6, 0.32, 1.6);
function updateScrollers() {
  const vh = window.innerHeight;
  for (const s of scrollers) {
    const r = s.el.getBoundingClientRect();
    const p = Math.min(Math.max((vh - r.top) / ((vh + r.height) * 0.5), 0), 1);
    if (p === s.current) continue;
    s.current = p;
    const e = s.a.ease === 'ease-in-out-back' ? backInOut(p) : p;
    const [f0, f1] = [s.a.frames[0] ?? {}, s.a.frames[s.a.frames.length - 1] ?? {}];
    const lerp = (k: keyof Frame, d: number) => ((f0[k] as number) ?? d) + (((f1[k] as number) ?? d) - ((f0[k] as number) ?? d)) * e;
    s.el.style.transform = transform({ ...s.base, r: lerp('r', 0), sx: lerp('sx', 1), sy: lerp('sy', 1), o: lerp('o', 1) });
  }
}

function initBlockAnimations() {
  document.querySelectorAll<HTMLElement>('[data-anim]').forEach((el) => {
    const cfg: Config = JSON.parse(el.dataset.anim!);
    const base = cfg.base ?? {};
    if (cfg.origin) el.style.transformOrigin = cfg.origin;
    for (const a of cfg.animations ?? []) {
      if (a.trigger === 'appear') runAppear(el, a, base);
      else if (a.trigger === 'hover') runHover(el, a, base);
      else if (a.trigger === 'loop') runLoop(el, a, base);
      else if (a.trigger === 'scroll') runScroll(el, a, base);
    }
  });
  if (scrollers.length) {
    let ticking = false;
    const tick = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateScrollers();
        ticking = false;
      });
    };
    updateScrollers();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
  }
}

export function initAnimations() {
  if (REDUCED) {
    document.documentElement.classList.remove('js-anim');
    return;
  }
  initReveal();
  initBlockAnimations();
}
