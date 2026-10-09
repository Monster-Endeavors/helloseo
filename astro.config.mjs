// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.helloseo.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  // Rich-text copy relies on HTML whitespace rules between inline elements.
  compressHTML: true,
  integrations: [sitemap({ filter: (page) => !/\/(404|thank-you|case-study-template)$/.test(page) })],
  devToolbar: { enabled: false },
});
