# HelloSEO

The [helloseo.com](https://www.helloseo.com) marketing site, rebuilt in [Astro](https://astro.build) from the original Squarespace site. Layout, copy, styling and interactions match the live site.

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # static site in dist/
npm run compare    # pixel-diff against the live site (see below)
```

## How pages are built

Every page is a stack of **sections**. Most sections lay their content out on the same responsive grid the original used: 24 columns on desktop, 8 on phones, with rows that scale with the viewport. Each piece of content is a **block** placed on that grid.

```astro
<Section theme="dark" grid={{ rows: [12, 9], rowGap: 11, colGap: 11 }}>
  <Text m="1/2/4/10" d="2/4/5/14" align="center">
    <h2>Meet the team</h2>
  </Text>
  <Img m="4/2/12/10" d="1/15/10/24" src={photo} alt="…" radius="30px" />
  <Button m="12/2/13/6" d="6/4/7/9" href="/contact">Get started</Button>
</Section>
```

- `m` / `d` are CSS `grid-area` values for mobile and desktop (`row-start / col-start / row-end / col-end`). Column 1 and the last column are the page gutters.
- `z`, `align` (`start | center | end`) and `alignM` control stacking and vertical alignment within the cell.
- `grid.rows` is the number of rows in each layout. Rows grow if content needs more room.
- `theme` picks one of the colour themes in `src/styles/themes.css` (`white`, `light`, `bright`, `dark`, …).

Blocks live in `src/components/blocks/`: `Text`, `Img`, `Button`, `Shape`, `Line`, `Form`, `Accordion`, `Embed`, `SocialLinks`. Other section types: `LogoMarquee`, `Testimonials` and `StatsList`.

Block animations are described with an `anim` prop, for example `anim={{ animations: [{ trigger: 'hover', duration: 0.5, ease: 'spring', bounce: 0.5, frames: [{ sx: 1.05, sy: 1.05 }] }] }}`. Triggers are `appear`, `hover`, `loop` and `scroll` (see `src/scripts/animations.ts`). Text, images and buttons also reveal themselves on scroll automatically.

## Where things are

| Path | What |
| --- | --- |
| `src/pages/` | One file per page. The blog lives in `src/content/blog/` (Markdown) with templates in `src/pages/blog/`. |
| `src/layouts/Layout.astro` | `<head>`, header, footer, cookie banner, analytics. |
| `src/components/Header.astro`, `Footer.astro` | Site chrome. Navigation items are in `src/data/navigation.ts`. |
| `src/data/forms.ts` | Fields for the contact and SEO report card forms. |
| `src/styles/` | Design tokens and type scale (`base.css`), colour themes, grid/sections (`layout.css`), blocks, header, forms. |
| `src/scripts/` | Small, dependency-free scripts: header behaviour, animations, parallax, carousel, counters, forms, consent. |
| `src/assets/images/` | Original images (Astro generates responsive WebP versions at build time). |
| `public/fonts/` | Self-hosted Arimo, Newsreader (both OFL) and CocomatPro. |

## Forms

The contact and SEO report card forms POST JSON to the URL in `PUBLIC_FORM_ENDPOINT` (any form backend: Formspree, Basin, a serverless function, …):

```sh
PUBLIC_FORM_ENDPOINT=https://formspree.io/f/xxxxxxx npm run build
```

Fields are validated in the browser first. The contact form then redirects to `/thank-you`; the report card form shows "Thank you!". If `PUBLIC_FORM_ENDPOINT` is not set, the forms show a message asking visitors to email team@helloseo.com instead.

## Third-party scripts

Same as the original site: Google Analytics (`G-BBCS9KY8F3`) in consent mode (analytics stays off until a visitor accepts cookies), the accessiBe widget, and the Calendly embed on the SEO Power Hour page.

## Checking against the live site

`npm run compare` screenshots pages on both helloseo.com and the local dev server, then writes live/local/diff images to `.compare/`:

```sh
npm run compare -- --all            # every page at 1440px and 390px
npm run compare -- /contact 390     # one page, one width
```

Animated content (logo marquees, looping images, count-up numbers, parallax) is captured at slightly different moments on each site, so a small diff in those areas is expected.
