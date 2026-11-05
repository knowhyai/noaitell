import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { analyticsTags } from './scripts/analytics.mjs';
import { resolve } from 'node:path';
import { pages, generatePages, root } from './scripts/pages.mjs';
generatePages();
export default defineConfig(({ mode }) => ({
  plugins: [{ name: 'optional-analytics', transformIndexHtml() { return analyticsTags(loadEnv(mode, root, 'VITE_')); } }],
  test: { globalSetup: [resolve(root, 'scripts/test-setup.mjs')] },
  build: { rollupOptions: { input: Object.fromEntries(pages.map(p => [p.slug || 'home', resolve(root, p.slug, 'index.html')])) } },
}));
