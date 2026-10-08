/**
 * "Soft corner" section dividers: the bottom edge of a section curves up at
 * both ends so the next section appears to have rounded top corners. The clip
 * path is expressed in objectBoundingBox units, so it is recomputed whenever the
 * section changes size (the corner size is fixed in vw, the section is not).
 */
let uid = 0;

function draw(section: HTMLElement) {
  const border = section.querySelector<HTMLElement>(':scope > .section__border');
  const clip = section.querySelector<SVGClipPathElement>('.section-divider clipPath');
  const clipPath = clip?.querySelector('path');
  const stroke = section.querySelector<SVGPathElement>('.section-divider path.stroke');
  if (!border || !clip || !clipPath || !stroke) return;

  const { width: W, height: H } = border.getBoundingClientRect();
  if (!W || !H) return;
  const raw = getComputedStyle(section).getPropertyValue('--divider-height').trim();
  const d = raw.endsWith('vw') ? (parseFloat(raw) * window.innerWidth) / 100 : parseFloat(raw) || 0;
  const dx = d / W;
  const dy = d / H;
  const strokeWidth = parseFloat(getComputedStyle(section).getPropertyValue('--divider-stroke-width')) || 6;
  const o = Math.round((strokeWidth / 2 / W) * 1000) / 1000; // overshoot so the stroke caps sit off-screen
  // "concave": the section's corners reach down and the edge between them lifts (next section looks rounded).
  // "convex": the section itself gets rounded bottom corners.
  const curve = section.hasAttribute('data-divider-concave')
    ? `M${-o}, 1 l0,0 c0,${-0.75 * dy} ${0.25 * dx},${-dy} ${dx},${-dy} h${1 + 2 * o - 2 * dx} c${0.75 * dx},0 ${dx},${0.25 * dy} ${dx},${dy} l0,0`
    : `M${-o}, ${1 - dy} l0,0 c0,${0.75 * dy} ${0.25 * dx},${dy} ${dx},${dy} h${1 + 2 * o - 2 * dx} c${0.75 * dx},0 ${dx},${-0.25 * dy} ${dx},${-dy} l0,0`;
  clipPath.setAttribute('d', `${curve} L1, -1 L0, -1 z`);
  stroke.setAttribute('d', `M-100,0.5 L-100,1.5 ${curve}`);

  if (!clip.id) clip.id = `section-divider-${++uid}`;
  border.style.clipPath = `url(#${clip.id})`;
}

export function initDividers() {
  const sections = document.querySelectorAll<HTMLElement>('.section[data-divider]');
  if (!sections.length) return;
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) draw(e.target.closest<HTMLElement>('.section')!);
  });
  sections.forEach((s) => {
    const border = s.querySelector(':scope > .section__border');
    if (border) ro.observe(border);
    draw(s);
  });
}
