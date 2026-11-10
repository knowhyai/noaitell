import { loadIntegrationEnv, newsletterHref } from './analytics.mjs';
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
// Live Knowhy properties only (checked 2026-11-10). Vault is a private 401 and is omitted.
const NETWORK = [
  ['https://knowhy.net/', 'KNOWHY'],
  ['https://lab.knowhy.net/', 'Lab'],
  ['https://news.knowhy.net/', 'News'],
  ['https://models.knowhy.net/', 'Models'],
  ['https://design.knowhy.net/', 'Design'],
  ['https://scope.knowhy.net/', 'Scope'],
  ['https://apps.knowhy.net/', 'Apps'],
  ['https://game.knowhy.net/', 'Games'],
  ['https://reset.knowhy.net/', 'Reset'],
  ['https://noaitell.com/', 'NoAITell'],
];
const networkItems = () => NETWORK.map(([href, name]) => `<li><a href="${esc(href)}"${href.startsWith('https://noaitell.com') ? ' aria-current="page"' : ''}>${esc(name)}</a></li>`).join('');
const BRAND_MARK = '<svg width="24" height="28" viewBox="0 0 24 28" fill="none" aria-hidden="true"><path d="M4 24L9 5L16 2L21 8L13 24L4 26Z" stroke="currentColor" stroke-width="1.6"/><path d="M5 24L13 15M9 5L18 10" stroke="currentColor" stroke-width="1.6"/><circle cx="13" cy="15" r="2" fill="currentColor"/></svg>';
function renderStructuredData(p) {
  const pageUrl = BASE_URL + pathFor(p);
  const website = { '@type': 'WebSite', '@id': `${BASE_URL}/#website`, name: 'NoAITell', url: `${BASE_URL}/` };
  const org = { '@type': 'Organization', '@id': 'https://knowhy.net/#organization', name: 'KNOWHY', url: 'https://knowhy.net/', email: 'noaitell@knowhy.net' };
  website.publisher = { '@id': org['@id'] };
  const node = p.tool
    ? { '@type': 'WebApplication', name: p.h1, description: p.description, url: pageUrl, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, isPartOf: { '@id': website['@id'] } }
    : { '@type': 'WebPage', name: p.h1, description: p.description, url: pageUrl, isPartOf: { '@id': website['@id'] } };
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [org, website, node] }).replace(/</g, '\\u003c')}</script>`;
}
export function renderPage(p, pages = modulePages, locales = moduleLocales) {
 const htmlLang = esc(p.localeConf?.htmlLang ?? 'en');
 const noindex = p.localeConf?.indexable === false ? '<meta name="robots" content="noindex">' : '';
 const alternates = alternatesFor(p, localeGroups(pages, locales)).map(a => `<link rel="alternate" hreflang="${esc(a.hreflang)}" href="${esc(a.href)}">`).join('');
 const switcher = renderLangSwitcher(p, locales, pages);
 const links = pages.filter(q => (q.locale ?? 'en') === (p.locale ?? 'en') && q !== p).map(q => `<li><a href="${escapeHref(pathFor(q))}">${esc(q.h1)}</a></li>`).join('');
 const pricing = localeLink(pages, p, 'pricing');
 const privacy = localeLink(pages, p, 'privacy');
 const net = networkItems();
 const imageAlt = esc(p.h1);
 const pageUrl = `${esc(BASE_URL)}${escapeHref(pathFor(p))}`;
 const newsletter = newsletterHref(loadIntegrationEnv(root));
 const newsletterLink = newsletter ? ` · <a href="${esc(newsletter)}">Newsletter</a>` : '';
 return `<!doctype html><html lang="${htmlLang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${esc(p.title)}</title><meta name="description" content="${esc(p.description)}"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:url" content="${pageUrl}"><meta property="og:type" content="website"><meta property="og:image" content="${esc(BASE_URL)}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${imageAlt}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.title)}"><meta name="twitter:description" content="${esc(p.description)}"><meta name="twitter:image" content="${esc(BASE_URL)}/og.png"><meta name="twitter:image:alt" content="${imageAlt}"><!-- Verification and analytics tags are injected at build time when configured. --><link rel="canonical" href="${pageUrl}">${noindex}${alternates}<link rel="icon" href="/favicon.svg"><link rel="manifest" href="/site.webmanifest"><link rel="stylesheet" href="/src/style.css"></head><body><header class="site-header"><nav class="site-nav" aria-label="Main"><a class="brand" href="/">${BRAND_MARK}<span class="brand-knowhy">KNOWHY</span><span class="brand-product">NoAITell</span></a><div class="site-links"><a href="${pricing}">Pricing</a><a href="${privacy}">Privacy</a></div><div class="site-tools"><a class="knowhy-home" href="https://knowhy.net/">knowhy.net</a><details class="net-switch"><summary>Network</summary><ul class="network-list">${net}</ul></details><details class="nav-menu"><summary>Menu</summary><div class="nav-menu-panel"><a href="${pricing}">Pricing</a><a href="${privacy}">Privacy</a><a href="https://knowhy.net/">knowhy.net</a><ul class="network-list">${net}</ul></div></details></div></nav></header>${switcher}<main id="content"><section class="page-intro"><h1${p.heroTitle ? ' class="hero-title"' : ''}>${p.heroTitle ?? esc(p.h1)}</h1><p>${esc(p.description)}</p>${p.introExample ?? ''}</section>${p.tool?`<div id="app" data-clarity-mask="true"><div class="tool-fallback"><h2>Check and clean your text</h2><p>Your text stays on this device. Free: 3 uses/day, 500 words per use.</p><label for="static-editor">Source text</label><textarea id="static-editor" placeholder="Paste or type text to check locally…"></textarea><button class="primary" type="button" disabled>${esc(p.toolCopy?.cleanLabel ?? '')}</button><p class="trust-line">${esc(p.toolCopy?.trustLine ?? '')}</p><noscript><p>Enable JavaScript to inspect and clean text locally.</p></noscript></div></div>`:''}<article class="page-content">${p.body}${renderFAQs(p)}${p.pricingCard ?? ''}</article><nav class="page-content" aria-label="Related guides"><h2>Explore NoAITell</h2><ul class="guide-links">${links}</ul></nav></main><footer class="page-content site-footer"><nav class="network-nav" aria-label="KNOWHY network"><ul class="network-list">${net}</ul></nav><p class="footer-meta"><a href="${privacy}">Privacy</a> · <a href="${localeLink(pages, p, 'terms')}">Terms</a> · <a href="${localeLink(pages, p, 'refund')}">Refund policy</a> · <a href="mailto:noaitell@knowhy.net">noaitell@knowhy.net</a>${newsletterLink}</p><p class="footer-domain">noaitell.com</p></footer>${renderStructuredData(p)}<script type="module" src="/src/site.ts"></script>${p.tool?'<script type="module" src="/src/main.ts"></script>':''}</body></html>`;
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
