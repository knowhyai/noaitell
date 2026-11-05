import { expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { alternatesFor, collectPages, enabledLocales, generatePages, loadLocales, localeGroups, pathFor, renderPage, sitemapXml, validateLocales } from './pages.mjs';

const enLocale = { code: 'en', name: 'English', enabled: true, indexable: true, htmlLang: 'en' };
const frLocale = { code: 'fr', name: 'Français', enabled: true, indexable: true, htmlLang: 'fr-FR' };
const deNoIndex = { code: 'de', name: 'Deutsch', enabled: true, indexable: false, htmlLang: 'de-DE' };
const esDisabled = { code: 'es', name: 'Español', enabled: false, indexable: true, htmlLang: 'es-ES' };

const enPage = { slug: '', title: 't', h1: 'h', description: 'd', body: '<p>body</p>' };
const enPricing = { slug: 'pricing', title: 'tp', h1: 'hp', description: 'dp', body: '<p>body</p>' };

function fixture(locales, enFiles, localizedFiles) {
  const dir = mkdtempSync(join(tmpdir(), 'noaitell-i18n-'));
  mkdirSync(join(dir, 'content/pages'), { recursive: true });
  writeFileSync(join(dir, 'content/locales.json'), JSON.stringify(locales));
  if (enFiles) for (const [name, page] of Object.entries(enFiles)) writeFileSync(join(dir, 'content/pages', name + '.json'), JSON.stringify(page));
  for (const [code, files] of Object.entries(localizedFiles)) {
    mkdirSync(join(dir, 'content/locales', code), { recursive: true });
    for (const [name, page] of Object.entries(files)) writeFileSync(join(dir, 'content/locales', code, name + '.json'), JSON.stringify(page));
  }
  return dir;
}

it('parses and validates the locale config', () => {
  expect(() => validateLocales('nope')).toThrow(/array/);
  expect(() => validateLocales([{ code: 'fr', name: 'Français', enabled: true, indexable: true, htmlLang: 'fr' }])).toThrow(/"en"/);
  expect(() => validateLocales([enLocale, { ...enLocale }])).toThrow(/duplicate/);
  expect(() => validateLocales([{ code: 'fr', name: 'Français', htmlLang: 'fr' }])).toThrow(/missing/);
  expect(() => validateLocales([{ code: 'fr', name: 'Français', enabled: 'yes', indexable: true, htmlLang: 'fr' }])).toThrow(/booleans/);
  expect(() => validateLocales([{ code: 'eN:bad', name: 'x', enabled: true, indexable: true, htmlLang: 'en' }])).toThrow(/url-safe/);

  const dir = mkdtempSync(join(tmpdir(), 'noaitell-i18n-'));
  try {
    expect(() => loadLocales(dir)).toThrow();
    mkdirSync(join(dir, 'content'));
    writeFileSync(join(dir, 'content/locales.json'), JSON.stringify([enLocale, esDisabled]));
    const loaded = loadLocales(dir);
    expect(loaded).toHaveLength(2);
    expect(enabledLocales(loaded)).toEqual([enLocale]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it('hides the header language switcher when only one locale is enabled', () => {
  const page = { ...enPage, locale: 'en', localeConf: enLocale };
  const single = renderPage(page, [page], [enLocale]);
  expect(single).not.toContain('lang-switcher');
  const frPage = { ...enPage, locale: 'fr', localeConf: frLocale };
  const multi = renderPage(page, [page, frPage], [enLocale, frLocale]);
  expect(multi).toContain('nav class="lang-switcher" aria-label="Language"');
  expect(multi).toContain('hreflang="fr-FR" href="https://noaitell.com/fr/"');
  expect(multi).toContain('aria-current="true"');
  expect(renderPage(frPage, [page, frPage], [enLocale, frLocale])).toContain('href="https://noaitell.com/"');
  const frDisabled = renderPage(page, [page, frPage], [enLocale]);
  expect(frDisabled).not.toContain('lang-switcher');
  expect(frDisabled).not.toContain('hreflang');
});

it('builds per-locale pages independently with hreflang, noindex and sitemap alternates', () => {
  const dir = fixture([enLocale, frLocale, deNoIndex, esDisabled], { 'home': enPage, pricing: enPricing }, {
    fr: { 'home': enPage },
    de: { 'home': enPage },
    es: { 'home': enPage }
  });
  try {
    generatePages(dir);

    expect(existsSync(join(dir, 'index.html'))).toBe(true);
    expect(existsSync(join(dir, 'pricing/index.html'))).toBe(true);
    expect(existsSync(join(dir, 'fr/index.html'))).toBe(true);
    expect(existsSync(join(dir, 'de/index.html'))).toBe(true);
    expect(existsSync(join(dir, 'es'))).toBe(false);
    expect(existsSync(join(dir, 'fr/pricing/index.html'))).toBe(false);

    const enHome = readFileSync(join(dir, 'index.html'), 'utf8');
    expect(enHome).toContain('<html lang="en">');
    expect(enHome).not.toContain('name="robots"');
    expect(enHome).toContain('<link rel="alternate" hreflang="x-default" href="https://noaitell.com/">');
    expect(enHome).toContain('<link rel="alternate" hreflang="en" href="https://noaitell.com/">');
    expect(enHome).toContain('<link rel="alternate" hreflang="fr-FR" href="https://noaitell.com/fr/">');
    expect(enHome).not.toContain('<link rel="alternate" hreflang="de-DE"');

    const enPricingHtml = readFileSync(join(dir, 'pricing/index.html'), 'utf8');
    expect(enPricingHtml).toContain('rel="canonical" href="https://noaitell.com/pricing/"');
    expect(enPricingHtml).not.toContain('<link rel="alternate"');

    const frHome = readFileSync(join(dir, 'fr/index.html'), 'utf8');
    expect(frHome).toContain('<html lang="fr-FR">');
    expect(frHome).toContain('rel="canonical" href="https://noaitell.com/fr/"');
    expect(frHome).toContain('<p>body</p>');

    const deHome = readFileSync(join(dir, 'de/index.html'), 'utf8');
    expect(deHome).toContain('<html lang="de-DE">');
    expect(deHome).toContain('<meta name="robots" content="noindex">');

    const sitemap = readFileSync(join(dir, 'public/sitemap.xml'), 'utf8');
    const urls = sitemap.match(/<loc>/g) ?? [];
    expect(urls).toHaveLength(3);
    expect(sitemap).toContain('<url><loc>https://noaitell.com/</loc><xhtml:link rel="alternate" hreflang="x-default" href="https://noaitell.com/"/><xhtml:link rel="alternate" hreflang="en" href="https://noaitell.com/"/><xhtml:link rel="alternate" hreflang="fr-FR" href="https://noaitell.com/fr/"/></url>');
    expect(sitemap).toContain('<url><loc>https://noaitell.com/pricing/</loc></url>');
    expect(sitemap).toContain('<url><loc>https://noaitell.com/fr/</loc><xhtml:link');
    expect(sitemap).not.toContain('noaitell.com/de/');
    expect(sitemap).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

it('excludes non-indexable and disabled locales from grouping helpers', () => {
  const enP = { ...enPage, locale: 'en', localeConf: enLocale };
  const deP = { ...enPage, locale: 'de', localeConf: deNoIndex };
  const groups = localeGroups([enP, deP], [enLocale, deNoIndex]);
  expect(groups.get('')).toEqual([enP]);
  expect(alternatesFor(enP, groups)).toEqual([]);
  const all = collectPages(join(import.meta.dirname), enabledLocales(loadLocales()));
  for (const p of all) expect(p.locale).toBe('en');
});

it('keeps real enabled locales limited to en with unchanged URL shape', () => {
  const definitions = loadLocales();
  const active = enabledLocales(definitions);
  expect(active.map(l => l.code)).toEqual(['en']);
  expect(pathFor({ slug: '' })).toBe('/');
  expect(pathFor({ slug: 'pricing' })).toBe('/pricing/');
  expect(pathFor({ slug: '', locale: 'fr', localeConf: frLocale })).toBe('/fr/');
  expect(pathFor({ slug: 'pricing', locale: 'fr', localeConf: frLocale })).toBe('/fr/pricing/');
});
