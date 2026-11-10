// Build-time only: no tags, links, or external requests unless a value is set and safe.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const INTEGRATIONS = [
  { key: 'VITE_GSC_VERIFICATION', label: 'Google Search Console', accept: value => /^[A-Za-z0-9_-]{8,}$/.test(value) },
  { key: 'VITE_BING_VERIFICATION', label: 'Bing Webmaster', accept: value => /^[A-Za-z0-9]{8,}$/.test(value) },
  { key: 'VITE_GA4_ID', label: 'Google Analytics 4', accept: value => /^G-[A-Z0-9]+$/.test(value) },
  { key: 'VITE_CLARITY_ID', label: 'Microsoft Clarity', accept: value => /^[a-z0-9]+$/i.test(value) },
  { key: 'VITE_NEWSLETTER_URL', label: 'Newsletter', accept: value => /^https:\/\/[^\s"'<>]+$/.test(value) },
];

function parseEnvFile(text) {
  const file = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    file[key] = value;
  }
  return file;
}

// Process environment wins over .env so a host can override a local file. Missing files are ignored.
export function loadIntegrationEnv(dir = process.cwd()) {
  const file = existsSync(resolve(dir, '.env')) ? parseEnvFile(readFileSync(resolve(dir, '.env'), 'utf8')) : {};
  const env = {};
  for (const item of INTEGRATIONS) env[item.key] = (process.env[item.key] || file[item.key] || '').trim();
  return env;
}

export function integrationStatus(env = {}) {
  return INTEGRATIONS.map(item => {
    const value = (env[item.key] || '').trim();
    if (!value) return { key: item.key, label: item.label, state: 'missing' };
    return { key: item.key, label: item.label, state: item.accept(value) ? 'configured' : 'invalid' };
  });
}

export function newsletterHref(env = {}) {
  const url = (env.VITE_NEWSLETTER_URL || '').trim();
  return INTEGRATIONS.find(item => item.key === 'VITE_NEWSLETTER_URL').accept(url) ? url : '';
}

export function analyticsTags(env = {}) {
 const tags = [];
 const gsc = (env.VITE_GSC_VERIFICATION || '').trim();
 if (gsc && INTEGRATIONS.find(item => item.key === 'VITE_GSC_VERIFICATION').accept(gsc)) tags.push({tag:'meta',attrs:{name:'google-site-verification',content:gsc}});
 const bing = (env.VITE_BING_VERIFICATION || '').trim();
 if (bing && INTEGRATIONS.find(item => item.key === 'VITE_BING_VERIFICATION').accept(bing)) tags.push({tag:'meta',attrs:{name:'msvalidate.01',content:bing}});
 const ga = (env.VITE_GA4_ID || '').trim();
 if (INTEGRATIONS.find(item => item.key === 'VITE_GA4_ID').accept(ga)) {
  tags.push({tag:'script',attrs:{async:true,src:`https://www.googletagmanager.com/gtag/js?id=${ga}`}});
  tags.push({tag:'script',children:`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}',{send_page_view:true});`});
 }
 const clarity = (env.VITE_CLARITY_ID || '').trim();
 if (INTEGRATIONS.find(item => item.key === 'VITE_CLARITY_ID').accept(clarity)) tags.push({tag:'script',children:`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script','${clarity}');`});
 return tags;
}
