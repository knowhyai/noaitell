import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { pages, generatePages, root } from './scripts/pages.mjs';
generatePages();
export default defineConfig({
  test: { globalSetup: [resolve(root, 'scripts/test-setup.mjs')] },
  build: { rollupOptions: { input: Object.fromEntries(pages.map(p => [p.slug || 'home', resolve(root, p.slug, 'index.html')])) } },
});
