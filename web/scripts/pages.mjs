import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const pages = readdirSync(resolve(root, 'content/pages')).filter(n => n.endsWith('.json')).map(n => JSON.parse(readFileSync(resolve(root, 'content/pages', n), 'utf8')));
export const pathFor = p => p.slug ? `/${p.slug}/` : '/';
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderFAQs(p) {
 if (!p.faqs?.length) return '';
 const schema = {'@context':'https://schema.org','@type':'FAQPage',mainEntity:p.faqs.map(f => ({'@type':'Question',name:f.question,acceptedAnswer:{'@type':'Answer',text:f.answer}}))};
 return `<section class="faq"><h2>Frequently asked questions</h2>${p.faqs.map(f=>`<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join('')}</section><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`;
}
export function renderPage(p) {
 const links = pages.filter(q => q !== p).map(q => `<li><a href="${pathFor(q)}">${esc(q.h1)}</a></li>`).join('');
 return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${esc(p.title)}</title><meta name="description" content="${esc(p.description)}"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="https://noaitell.com${pathFor(p)}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary"><!-- GSC verification is injected when VITE_GSC_VERIFICATION is configured. --><link rel="canonical" href="https://noaitell.com${pathFor(p)}"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/src/style.css"></head><body><nav class="site-nav" aria-label="Main"><a href="/">NoAITell</a><a href="/pricing/">Pricing</a><a href="/privacy/">Privacy</a></nav><section class="page-intro"><h1>${esc(p.h1)}</h1><p>${esc(p.description)}</p></section>${p.tool?'<div id="app" data-clarity-mask="true"><main><h2>Check and clean your text</h2><p>Your text stays on this device. Free: 3 uses/day, 500 words per use.</p><label for="static-editor">Source text</label><textarea id="static-editor" placeholder="Paste or type text to check locally…"></textarea><noscript><p>Enable JavaScript to inspect and clean text locally.</p></noscript></main></div>':''}<article class="page-content">${p.body}${renderFAQs(p)}</article><nav class="page-content" aria-label="Related guides"><h2>Explore NoAITell</h2><ul class="guide-links">${links}</ul></nav><footer class="page-content"><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/refund/">Refund policy</a> · <a href="mailto:noaitell@knowhy.net">noaitell@knowhy.net</a></footer><script type="module" src="/src/site.ts"></script>${p.tool?'<script type="module" src="/src/main.ts"></script>':''}</body></html>`;
}
export function generatePages() {
 for (const p of pages) { const dir=resolve(root,p.slug); mkdirSync(dir,{recursive:true}); writeFileSync(resolve(dir,'index.html'),renderPage(p)); }
 writeFileSync(resolve(root,'public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(p=>`<url><loc>https://noaitell.com${pathFor(p)}</loc></url>`).join('')}</urlset>\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) generatePages();
