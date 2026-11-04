import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const pages = readdirSync(resolve(root, 'content/pages')).filter(n => n.endsWith('.json')).map(n => JSON.parse(readFileSync(resolve(root, 'content/pages', n), 'utf8')));
export const pathFor = p => p.slug ? `/${p.slug}/` : '/';
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderPage(p) {
 const links = pages.filter(q => q !== p).map(q => `<li><a href="${pathFor(q)}">${esc(q.h1)}</a></li>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${esc(p.title)}</title><meta name="description" content="${esc(p.description)}"><link rel="canonical" href="https://noaitell.com${pathFor(p)}"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/src/style.css"></head><body><nav class="site-nav" aria-label="Main"><a href="/">NoAITell</a><a href="/pricing/">Pricing</a><a href="/privacy/">Privacy</a></nav><section class="page-intro"><h1>${esc(p.h1)}</h1><p>${esc(p.description)}</p></section>${p.tool?'<div id="app"><p>Local cleaner loading. Your text stays on this device.</p></div>':''}<article class="page-content">${p.body}</article><nav class="page-content" aria-label="Related guides"><h2>Explore NoAITell</h2><ul class="guide-links">${links}</ul></nav><footer class="page-content"><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/refund/">Refund policy</a></footer>${p.tool?'<script type="module" src="/src/main.ts"></script>':''}</body></html>`;
}
export function generatePages() {
 for (const p of pages) { const dir=resolve(root,p.slug); mkdirSync(dir,{recursive:true}); writeFileSync(resolve(dir,'index.html'),renderPage(p)); }
 writeFileSync(resolve(root,'public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p=>`<url><loc>https://noaitell.com${pathFor(p)}</loc></url>`).join('')}</urlset>\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) generatePages();
