import { expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { generatePages } from './pages.mjs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const slugs = ['claude-watermark','chatgpt-watermark','gemini-ai-watermark','ai-watermark-checker','ai-text-watermark-remover','remove-ai-watermark-from-text','remove-em-dashes','invisible-character-remover','grok-watermark','textgrain','synthid-detector','ai-tell-checker'];
const read = path => readFileSync(resolve(root, path), 'utf8');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(resolve(dir,e.name)) : [resolve(dir,e.name)]);
it('contains no prohibited marketing claims in built or static output', () => {
  const prohibited = [['bypass','Turnitin'],['un','detectable'],['beat','AI','detectors'],['100%','remove','watermark']].map(words=>words.length===2&&words[0]==='un'?words.join(''):words.join(' '));
  const files = [...walk(resolve(root,'dist')), ...walk(root).filter(p=>p.endsWith('.html')&&!p.includes('/node_modules/')&&!p.includes('/dist/'))];
  for (const file of files) {
    const text = readFileSync(file,'utf8').toLowerCase();
    for (const phrase of prohibited) expect(text, file).not.toContain(phrase.toLowerCase());
  }
});
it('serves unique metadata, explanatory HTML, embedded tools and linked guides before JavaScript', () => {
  const titles=new Set(), headings=new Set(), descriptions=new Set();
  for(const slug of slugs) {
    const html=read('dist/'+slug+'/index.html');
    const title=html.match(/<title>(.*?)<\/title>/s)?.[1];
    const h1=html.match(/<h1>(.*?)<\/h1>/s)?.[1];
    const description=html.match(/name="description" content="([^"]+)"/)?.[1];
    expect(title).toBeTruthy(); expect(h1).toBeTruthy(); expect(description).toBeTruthy();
    titles.add(title); headings.add(h1); descriptions.add(description);
    expect(html).toContain('https://noaitell.com/'+slug+'/');
    expect(html).toContain('id="app"');
    expect(html).toContain('type="module"');
    const prose=html.split('<article class="page-content">')[1].split('</article>')[0].replace(/<[^>]+>/g,' ');
    expect(prose.trim().split(/\s+/).length,slug).toBeGreaterThanOrEqual(slug === 'ai-tell-checker' ? 100 : 300);
    for(const other of slugs.filter(other => other !== slug))expect(html).toContain('href="/'+other+'/"');
    expect(html).toContain('href="/"');
  }
  expect(titles.size).toBe(slugs.length);expect(headings.size).toBe(slugs.length);expect(descriptions.size).toBe(slugs.length);
});
it('includes all canonical pages in sitemap, policies, favicon and redirects', () => {
  const sitemap=read('dist/sitemap.xml');
  for(const slug of [...slugs,'pricing','privacy','terms','refund']) {
    expect(sitemap).toContain('https://noaitell.com/'+slug+'/');
    expect(read('dist/'+slug+'/index.html')).toContain('<h1>');
  }
  expect(read('dist/_redirects')).toContain('/ai-text-cleaner/ / 301');
  expect(read('dist/robots.txt')).toContain('Sitemap: https://noaitell.com/sitemap.xml');
  expect(read('dist/favicon.svg')).toContain('<svg');
  expect(read('dist/pricing/index.html').match(/<button disabled/g)).toHaveLength(3);
});
