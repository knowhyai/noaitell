import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pages, pathFor, root } from './pages.mjs';
const banned = ['bypass '+'Turnitin', 'un'+'detectable', 'beat AI '+'detectors', '100% remove '+'watermark'];
it('ships unique, complete static page metadata and no prohibited claims', () => {
 const seen = {title:new Set(),h1:new Set(),description:new Set()};
 for(const p of pages) {
  const html=readFileSync(resolve(root,'dist',p.slug,'index.html'),'utf8');
  for(const phrase of banned) expect(html.toLowerCase()).not.toContain(phrase.toLowerCase());
  for(const [key,regex] of Object.entries({title:/<title>(.*?)<\/title>/s,h1:/<h1\b[^>]*>(.*?)<\/h1>/s,description:/<meta name="description" content="([^"]+)"/})) {
   const value=html.match(regex)?.[1]; expect(value).toBeTruthy(); expect(seen[key].has(value)).toBe(false); seen[key].add(value);
  }
  expect(html.match(/<h1\b[^>]*>/g)).toHaveLength(1);
  expect(html).toContain(`rel="canonical" href="https://noaitell.com${pathFor(p)}"`);
  expect(html).toContain(p.body);
  if(p.tool) expect(html).toContain('id="app"');
 }
});
it('contains substantive guide drafts and complete sitemap links', () => {
 const guides=['claude-watermark','chatgpt-watermark','gemini-ai-watermark','ai-watermark-checker','ai-text-watermark-remover','remove-ai-watermark-from-text','remove-em-dashes','invisible-character-remover','grok-watermark','textgrain','synthid-detector'];
 const sitemap=readFileSync(resolve(root,'dist/sitemap.xml'),'utf8');
 for(const p of pages) expect(sitemap).toContain(`https://noaitell.com${pathFor(p)}`);
 for(const slug of guides) {const p=pages.find(p=>p.slug===slug);expect(p).toBeTruthy();expect(p.body.replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(300);}
});
it('ships social cards, contact details, real static tool content and matching FAQ schema', () => {
 for (const p of pages) {
  const html=readFileSync(resolve(root,'dist',p.slug,'index.html'),'utf8');
  for (const key of ['og:title','og:description','og:url','og:type']) expect(html).toContain(`property="${key}"`);
  expect(html).toContain('name="twitter:card"');
  expect(html).toContain(`property="og:url" content="https://noaitell.com${pathFor(p)}"`);
  expect(html.match(/<footer[^>]*>(.*?)<\/footer>/s)?.[1]).toContain('mailto:noaitell@knowhy.net');
  expect(html).not.toContain('Local cleaner loading');
  if(p.tool) { expect(html).toContain('id="static-editor"'); expect(html).toContain('data-clarity-mask="true"'); }
  if(p.faqs?.length) {
   const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
   expect(schema['@type']).toBe('FAQPage');
   expect(schema.mainEntity.map(q=>({question:q.name,answer:q.acceptedAnswer.text}))).toEqual(p.faqs.map(({question,answer})=>({question,answer})));
   expect(html.match(/<details class="faq-card">/g)).toHaveLength(p.faqs.length);
   expect(html).not.toContain('<details class="faq-card" open');
   for(const f of p.faqs) {expect(html).toContain(f.question);expect(html).toContain(f.answerHtml ?? f.answer);
    if(f.answerHtml) expect(f.answerHtml.replace(/<[^>]+>/g,'')).toBe(f.answer);}
  }
 }
 expect(readFileSync(resolve(root,'dist/sitemap.xml'),'utf8').match(/<url>/g)).toHaveLength(17);
});
it('offers live Free access and a valid Pro email notification form', () => {
 const html=readFileSync(resolve(root,'dist/pricing/index.html'),'utf8');
 expect(html).toContain('href="/#app">Free — use now');
 expect(html).toContain('type="email"');expect(html).toContain('required');
 expect(html).toContain('data-pro-notify');expect(html).not.toContain('Coming soon');
 for(const price of ['$4.99','$19.9','$199'])expect(html).toContain(price);
});
it('keeps home hierarchy, linked watermark details and preview pricing aligned', () => {
 const home=pages.find(p=>p.slug==='');
 const source=JSON.parse(readFileSync(resolve(root,'content/pages/home.json'),'utf8'));
 for(const field of ['body','faqs','pricingCard']) expect(home[field]).toEqual(source[field]);
 const html=readFileSync(resolve(root,'dist/index.html'),'utf8');
 expect(home.body.match(/class="cap-card"/g)).toHaveLength(3);
 expect(home.body.match(/class="tell-card"/g)).toHaveLength(3);
 expect(home.body.match(/class="steps"/g)).toHaveLength(1);
 expect(home.body).not.toContain('<h2>Contact</h2>');
 expect(home.body).not.toContain('U+200B');
 expect(html).toContain('U+200B U+034F U+2060 U+200B');
 expect(home.faqs.find(f=>f.answerHtml)?.answerHtml.match(/<a href=/g)).toHaveLength(5);
 expect(home.pricingCard).toContain('class="pricing-columns"');
 expect(home.pricingCard).toContain('Coming soon');
 expect(home.pricingCard.match(/href=/g)).toHaveLength(1);
 for(const price of ['$4.99','$19.9','$199']) expect(home.pricingCard).toContain(price);
});
