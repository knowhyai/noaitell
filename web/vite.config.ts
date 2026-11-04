import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { pages, generatePages, root } from './scripts/pages.mjs';
generatePages();
export default defineConfig({
  build: { rollupOptions: { input: Object.fromEntries(pages.map(p => [p.slug || 'home', resolve(root, p.slug, 'index.html')])) } },
});
