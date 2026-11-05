import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export const BASE_URL = 'https://noaitell.com';

export function validateLocales(raw) {
  if (!Array.isArray(raw)) throw new Error('content/locales.json must contain an array of locale records');
  const seen = new Set();
  for (const record of raw) {
    for (const field of ['code', 'name', 'enabled', 'indexable', 'htmlLang']) {
      if (record?.[field] === undefined || record?.[field] === null || record?.[field] === '') throw new Error(`locale record is missing the "${field}" field`);
    }
    const { code, name, enabled, indexable, htmlLang } = record;
    if (typeof code !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(code)) throw new Error(`locale code "${code}" must be a lowercase url-safe string`);
    if (typeof name !== 'string') throw new Error(`locale "${code}" name must be a string`);
    if (typeof enabled !== 'boolean' || typeof indexable !== 'boolean') throw new Error(`locale "${code}" fields "enabled" and "indexable" must be booleans`);
    if (typeof htmlLang !== 'string') throw new Error(`locale "${code}" htmlLang must be a string`);
    if (seen.has(code)) throw new Error(`duplicate locale code "${code}" in content/locales.json`);
    seen.add(code);
  }
  if (!raw.some(l => l.code === 'en')) throw new Error('content/locales.json must define the "en" default locale');
  return raw;
}

export function loadLocales(webRoot = root) {
  return validateLocales(JSON.parse(readFileSync(resolve(webRoot, 'content/locales.json'), 'utf8')));
}

export function enabledLocales(definitions = loadLocales()) {
  return definitions.filter(l => l.enabled);
}

export function collectPages(webRoot = root, locales = enabledLocales(loadLocales(webRoot))) {
  const collected = [];
  for (const loc of locales) {
    const dir = loc.code === 'en' ? resolve(webRoot, 'content/pages') : resolve(webRoot, 'content/locales', loc.code);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter(n => n.endsWith('.json'))) {
      const page = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
      if (loc.code === 'en') {
        const localized = resolve(webRoot, 'content/locales/en', file);
        if (existsSync(localized)) Object.assign(page, JSON.parse(readFileSync(localized, 'utf8')));
      }
      page.locale = loc.code;
      page.localeConf = loc;
      collected.push(page);
    }
  }
  return collected;
}

export function localePagePath(code = 'en', slug) {
  if (code === 'en') return slug ? `/${slug}/` : '/';
  return slug ? `/${code}/${slug}/` : `/${code}/`;
}
export const pathFor = p => localePagePath(p.locale ?? 'en', p.slug);
const pageKey = p => p.slug ?? '';

function indexableLocales(locales) {
  return locales.filter(l => l.indexable);
}

export function localeGroups(pages, locales) {
  const allowed = new Set(indexableLocales(locales).map(l => l.code));
  const groups = new Map();
  for (const p of pages) {
    if (!allowed.has(p.locale ?? 'en')) continue;
    const key = pageKey(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return groups;
}

export function alternatesFor(p, groups) {
  const group = groups.get(pageKey(p));
  if (!group || group.length < 2) return [];
  const enEntry = group.find(q => (q.locale ?? 'en') === 'en');
  const list = [];
  if (enEntry) list.push({ hreflang: 'x-default', href: BASE_URL + pathFor(enEntry) });
  for (const q of group) list.push({ hreflang: q.localeConf.htmlLang, href: BASE_URL + pathFor(q) });
  return list;
}

export function renderLangSwitcher(p, locales, pages) {
  if (locales.length < 2) return '';
  const current = esc(p.localeConf?.htmlLang ?? 'en');
  const items = locales.map(loc => {
    const lang = esc(loc.htmlLang);
    const name = esc(loc.name);
    if ((p.locale ?? 'en') === loc.code) return `<span lang="${lang}" hreflang="${lang}" aria-current="true">${name}</span>`;
    const target = pages.find(q => q.locale === loc.code && pageKey(q) === pageKey(p));
    const href = esc(BASE_URL + (target ? pathFor(target) : localePagePath(loc.code)));
    return `<a lang="${lang}" hreflang="${lang}" href="${href}">${name}</a>`;
  }).join('<span aria-hidden="true"> · </span>');
  return `<nav class="lang-switcher" aria-label="Language">${items}</nav>`;
}

export function sitemapXml(pages, locales = localesOf(pages)) {
  const groups = localeGroups(pages, locales);
  const entries = pages.filter(p => p.localeConf?.indexable !== false).map(p => {
    const alternates = alternatesFor(p, groups);
    const links = alternates.map(a => `<xhtml:link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}"/>`).join('');
    return `<url><loc>${BASE_URL}${pathFor(p)}</loc>${links}</url>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries}</urlset>\n`;
}

function localesOf(pages) {
  return [...new Map(pages.map(p => [p.locale ?? 'en', p.localeConf]).filter(([, v]) => v)).values()];
}
const esc = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderFAQs(p) {
 if (!p.faqs?.length) return '';
 const schema = {'@context':'https://schema.org','@type':'FAQPage',mainEntity:p.faqs.map(f => ({'@type':'Question',name:f.question,acceptedAnswer:{'@type':'Answer',text:f.answer}}))};
 return `<section class="faq"><h2>Frequently asked questions</h2>${p.faqs.map(f=>`<details class="faq-card"><summary>${esc(f.question)}<span class="faq-icon" aria-hidden="true">+</span></summary><div class="faq-answer"><p>${f.answerHtml ?? esc(f.answer)}</p></div></details>`).join('')}</section><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`;
}
function localeLink(pages, p, slug) {
  const sameLocale = pages.find(q => (q.locale ?? 'en') === (p.locale ?? 'en') && pageKey(q) === slug);
  const enPage = pages.find(q => (q.locale ?? 'en') === 'en' && pageKey(q) === slug);
  return escapeHref(pathFor(sameLocale ?? enPage ?? { locale: p.locale ?? 'en', slug }));
}
const escapeHref = href => esc(href);
export function renderPage(p, pages = modulePages, locales = moduleLocales) {
 const htmlLang = esc(p.localeConf?.htmlLang ?? 'en');
 const noindex = p.localeConf?.indexable === false ? '<meta name="robots" content="noindex">' : '';
 const alternates = alternatesFor(p, localeGroups(pages, locales)).map(a => `<link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}">`).join('');
 const switcher = renderLangSwitcher(p, locales, pages);
 const links = pages.filter(q => (q.locale ?? 'en') === (p.locale ?? 'en') && q !== p).map(q => `<li><a href="${escapeHref(pathFor(q))}">${esc(q.h1)}</a></li>`).join('');
 return `<!doctype html><html lang="${htmlLang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${esc(p.title)}</title><meta name="description" content="${esc(p.description)}"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${esc(BASE_URL)}${escapeHref(pathFor(p))}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary"><!-- GSC verification is injected when VITE_GSC_VERIFICATION is configured. --><link rel="canonical" href="${esc(BASE_URL)}${escapeHref(pathFor(p))}">${noindex}${alternates}<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/src/style.css"></head><body><nav class="site-nav" aria-label="Main"><a class="brand" href="/"><svg viewBox="0 0 24 28" fill="none" aria-hidden="true"><path d="M4 24L9 5L16 2L21 8L13 24L4 26Z" stroke="currentColor" stroke-width="1.6"/><path d="M5 24L13 15M9 5L18 10" stroke="currentColor" stroke-width="1.6"/><circle cx="13" cy="15" r="2" fill="currentColor"/></svg> NoAITell</a><a href="${localeLink(pages, p, 'pricing')}">Pricing</a><a href="${localeLink(pages, p, 'privacy')}">Privacy</a></nav>${switcher}<section class="page-intro"><h1${p.heroTitle ? ' class="hero-title"' : ''}>${p.heroTitle ?? esc(p.h1)}</h1><p>${esc(p.description)}</p>${p.introExample ?? ''}</section>${p.tool?`<div id="app" data-clarity-mask="true"><main><h2>Check and clean your text</h2><p>Your text stays on this device. Free: 3 uses/day, 500 words per use.</p><label for="static-editor">Source text</label><textarea id="static-editor" placeholder="Paste or type text to check locally…"></textarea><button class="primary" disabled>${esc(p.toolCopy?.cleanLabel ?? '')}</button><p class="trust-line">${esc(p.toolCopy?.trustLine ?? '')}</p><noscript><p>Enable JavaScript to inspect and clean text locally.</p></noscript></main></div>`:''}<article class="page-content">${p.body}${renderFAQs(p)}${p.pricingCard ?? ''}</article><nav class="page-content" aria-label="Related guides"><h2>Explore NoAITell</h2><ul class="guide-links">${links}</ul></nav><footer class="page-content"><a href="${localeLink(pages, p, 'privacy')}">Privacy</a> · <a href="${localeLink(pages, p, 'terms')}">Terms</a> · <a href="${localeLink(pages, p, 'refund')}">Refund policy</a> · <a href="mailto:noaitell@knowhy.net">noaitell@knowhy.net</a></footer><script type="module" src="/src/site.ts"></script>${p.tool?'<script type="module" src="/src/main.ts"></script>':''}</body></html>`;
}
export function generatePages(targetRoot = root) {
  const locales = enabledLocales(loadLocales(targetRoot));
  const pages = collectPages(targetRoot, locales);
  for (const p of pages) {
    const dir = p.locale === 'en' ? resolve(targetRoot, p.slug ?? '') : resolve(targetRoot, p.locale, p.slug ?? '');
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'index.html'), renderPage(p, pages, locales));
  }
  mkdirSync(resolve(targetRoot, 'public'), { recursive: true });
  writeFileSync(resolve(targetRoot, 'public/sitemap.xml'), sitemapXml(pages, locales));}
const localeDefinitions = loadLocales(root);
const moduleLocales = enabledLocales(localeDefinitions);
const modulePages = collectPages(root, moduleLocales);
export { moduleLocales as locales, modulePages as pages };
if (process.argv[1] === fileURLToPath(import.meta.url)) generatePages();
