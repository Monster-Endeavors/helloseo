// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.helloseo.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  // Rich-text copy relies on HTML whitespace rules between inline elements.
  compressHTML: true,
  // Squarespace also served the homepage at /home
  redirects: { '/home': '/' },
  integrations: [sitemap({ filter: (page) => !/\/(404|thank-you|case-study-template)$/.test(page) })],
  devToolbar: { enabled: false },
});
