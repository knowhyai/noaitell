import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  build: { rollupOptions: { input: {
    main: resolve(__dirname, 'index.html'), cleaner: resolve(__dirname, 'ai-text-cleaner/index.html'), checker: resolve(__dirname, 'ai-tell-checker/index.html'), dashes: resolve(__dirname, 'remove-em-dashes/index.html'), chatgpt: resolve(__dirname, 'chatgpt-watermark/index.html'), claude: resolve(__dirname, 'claude-watermark/index.html'), gemini: resolve(__dirname, 'gemini-watermark/index.html')
  }}},
});
