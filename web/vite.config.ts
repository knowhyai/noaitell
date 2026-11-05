import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { analyticsTags } from './scripts/analytics.mjs';
import { resolve } from 'node:path';
import { pages, generatePages, root, localePagePath } from './scripts/pages.mjs';
generatePages();
export default defineConfig(({ mode }) => ({
  plugins: [{ name: 'optional-analytics', transformIndexHtml() { return analyticsTags(loadEnv(mode, root, 'VITE_')); } }],
  test: { globalSetup: [resolve(root, 'scripts/test-setup.mjs')] },
  build: { rollupOptions: { input: Object.fromEntries(pages.map(p => {
    const locale = p.locale || 'en';
    const key = (locale === 'en' ? '' : locale + '-') + (p.slug || 'home');
    const dir = localePagePath(locale, p.slug).replace(/^\/|\/$/g, '');
    return [key, resolve(root, dir, 'index.html')];
  })) } },
}));
