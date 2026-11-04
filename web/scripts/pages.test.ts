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
  for(const [key,regex] of Object.entries({title:/<title>(.*?)<\/title>/s,h1:/<h1>(.*?)<\/h1>/s,description:/<meta name="description" content="([^"]+)"/})) {
   const value=html.match(regex)?.[1]; expect(value).toBeTruthy(); expect(seen[key].has(value)).toBe(false); seen[key].add(value);
  }
  expect(html.match(/<h1>/g)).toHaveLength(1);
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
