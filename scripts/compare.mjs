// Visual regression check against the live Squarespace site.
//
//   npm run dev            (in another terminal)
//   npm run compare -- /contact 390
//   npm run compare -- --all
//
// Screenshots each page on both sites (animations settled, cookie banners hidden),
// writes live / local / diff PNGs to .compare/, and prints the pixel difference.
import { chromium } from 'playwright';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const LIVE = process.env.LIVE_URL ?? 'https://www.helloseo.com';
const LOCAL = process.env.LOCAL_URL ?? 'http://localhost:4321';
const PAGES = ['/', '/seo-power-hour', '/done-for-you-seo-aeo', '/digital-pr', '/paid-google-ads', '/content-hub', '/results',
  '/meet-the-team', '/meet-the-founder', '/contact', '/seo-report-card', '/privacy-policy', '/terms-and-conditions',
  '/fulfillment-policy', '/case-study-template', '/case-study-1', '/case-study-2', '/case-study-3', '/thank-you', '/404',
  '/blog', '/blog/what-therapists-wish-theyd-known-before-starting'];

const args = process.argv.slice(2);
const widths = args.filter((a) => /^\d+$/.test(a)).map(Number);
const paths = args.includes('--all') ? PAGES : args.filter((a) => a.startsWith('/'));
if (!paths.length) paths.push('/');
if (!widths.length) widths.push(1440, 390);
fs.mkdirSync('.compare', { recursive: true });

async function capture(browser, url, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.addStyleTag({ content: '[class*="cookie-banner"],[data-cookies]{display:none!important}' });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    for (const a of document.getAnimations()) {
      const t = a.effect?.getComputedTiming?.();
      if (t && t.iterations === Infinity) { a.pause(); a.currentTime = 0; } else { try { a.finish(); } catch {} }
    }
  });
  const png = PNG.sync.read(await page.screenshot({ fullPage: true }));
  await page.close();
  return png;
}

function pad(img, w, h) {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);
  PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
  return out;
}

const browser = await chromium.launch();
for (const width of widths) {
  for (const path of paths) {
    const [a, b] = await Promise.all([capture(browser, LIVE + path, width), capture(browser, LOCAL + path, width)]);
    const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
    const diff = new PNG({ width: w, height: h });
    const n = pixelmatch(pad(a, w, h).data, pad(b, w, h).data, diff.data, w, h, { threshold: 0.1 });
    const name = `${(path.replace(/^\/|\/$/g, '') || 'home').replace(/\//g, '_')}-${width}`;
    fs.writeFileSync(`.compare/${name}-live.png`, PNG.sync.write(a));
    fs.writeFileSync(`.compare/${name}-local.png`, PNG.sync.write(b));
    fs.writeFileSync(`.compare/${name}-diff.png`, PNG.sync.write(diff));
    const heights = a.height === b.height ? `${a.height}px tall` : `HEIGHT MISMATCH live ${a.height} / local ${b.height}`;
    console.log(`${path.padEnd(58)} @${width}  ${((100 * n) / (w * h)).toFixed(2)}% differ  (${heights})`);
  }
}
await browser.close();
