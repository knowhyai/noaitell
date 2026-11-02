import { describe, expect, it } from 'vitest';
import { rules } from './rules';
import { analyze, emojiSafeInvisible } from './detect';
import { clean, defaultOptions } from './clean';
describe('rule corpus',()=>{ for(const rule of rules) for(const sample of rule.testCases) it(`${rule.id}: ${sample.text}`,()=>expect(rule.matcher(sample.text).length>0).toBe(sample.matches)); });
describe('deterministic checks',()=>{
 it('detects and removes invisible characters while retaining emoji ZWJ',()=>{const text='A\u200BB 👩‍💻';expect(analyze(text).invisibleCount).toBe(1);expect(emojiSafeInvisible(text)).toBe('AB 👩‍💻');});
 it('only detects mixed-script homoglyphs inside a word',()=>{const a=analyze('pаypal');expect(a.findings.some(x=>x.ruleId==='CHAR02')).toBe(true);expect(analyze('Привет мир').findings.some(x=>x.ruleId==='CHAR02')).toBe(false);});
 it('does not scan Markdown inside code, quotes, or links',()=>{const a=analyze('`**bold**`\n> **quote**\n[not just X, but Y](https://x.test)');expect(a.findings.filter(x=>x.ruleId==='MD01'||x.ruleId==='EN01')).toHaveLength(0);});
 it('removes known tracking parameters and keeps functional values',()=>{const preserved=clean('[x](https://a.test/p?utm_source=x&id=2)',{...defaultOptions,plainText:false}).text;expect(preserved).toContain('id=2');expect(preserved).not.toContain('utm_source');});
 it('does not penalize Chinese typography',()=>{expect(analyze('中文“引号”与——是正常排版。').findings.some(x=>x.ruleId==='PUNC01')).toBe(false);});
 it('runs English rules for English sentences inside a mixed-language paragraph',()=>{const a=analyze('这是中文说明。 Let\'s dive into the key benefits. 这里继续中文。');expect(a.findings.some(x=>x.ruleId==='EN05')).toBe(true);});
 it('normalises NBSP and narrow NBSP to regular spaces',()=>{expect(clean('hello\u00A0world\u202Fagain',defaultOptions).text).toBe('hello world again');});
 it('reports headline density from sentence-pattern hits only',()=>{const text=`It is not just software, but a tool. ${'x'.repeat(200)} **bold** **again**`;const a=analyze(text);expect(a.patternHits).toBe(1);expect(a.formatHits).toBe(2);expect(a.density).toBe(Math.round(1/a.visibleChars*1000*10)/10);});
 it('finds ZH05 after a comma within a sentence',()=>{expect(analyze('数据显示，值得注意的是趋势正在变化。').findings.some(x=>x.ruleId==='ZH05')).toBe(true);});
 it('finds the common ZH04 era variant without 的 or 下',()=>{expect(analyze('在当今数字化时代，内容创作正在被重塑。').findings.some(x=>x.ruleId==='ZH04')).toBe(true);});
 it('reports the number of individual cleaned findings, not transformation passes',()=>{const cleaned=clean('A\u200BB\u200BC',defaultOptions);expect(cleaned.processed).toBe(2);expect(cleaned.text).toBe('ABC');});
 it('keeps an ignored CHAR01 finding while cleaning the rest',()=>{const text='A\u200BB and C\u200BD';const ids=analyze(text).findings.filter(f=>f.ruleId==='CHAR01').map(f=>f.id);expect(ids).toHaveLength(2);const res=clean(text,defaultOptions,new Set([ids[0]]));expect(res.text).toBe('A\u200BB and CD');expect(res.processed).toBe(1);});
 it('keeps tracking on ignored links while stripping the others',()=>{const text='See [a](https://x.test/p?utm_source=1) and [b](https://y.test/q?utm_source=2).';const links=analyze(text).findings.filter(f=>f.ruleId==='LINK01');expect(links).toHaveLength(2);const stripped=clean(text,{...defaultOptions,plainText:false},new Set([links[0].id]));expect(stripped.text).toContain('utm_source=1');expect(stripped.text).not.toContain('utm_source=2');const single='Read [guide](https://y.test/q?utm_source=2) now.';const projected=clean(single,defaultOptions,new Set([analyze(single).findings.find(f=>f.ruleId==='LINK01')!.id]));expect(projected.text).toBe(single);});
 it('keeps an ignored WS01 range',()=>{const text='a  b';const ws=analyze(text).findings.find(f=>f.ruleId==='WS01');expect(ws).toBeTruthy();expect(clean(text,defaultOptions).text).toBe('a b');expect(clean(text,defaultOptions,new Set([ws!.id])).text).toBe('a  b');});
 it('matches the legacy output verbatim when ignoredIds is omitted or empty',()=>{
  const samples=[
   'A\u200BB and C\u200BD',
   'See [a](https://x.test/p?utm_source=1) and [b](https://y.test/q?utm_source=2).',
   'a  b  \nc',
   '# Title\n\nIt is not just **bold**, but **more** — really.\n\nVisit [our guide](https://example.com/guide?utm_source=chatgpt.com&id=42) for more.\u200B\u0020\u0020\n',
  ];
  // Goldens captured from the pre-ignoredIds behavior.
  const plainGoldens=[
   {text:'AB and CD',processed:2,remaining:0,changes:[{start:1,end:2,before:'\u200B',after:''},{start:9,end:10,before:'\u200B',after:''}]},
   {text:'See a and b.',processed:2,remaining:0,changes:[{start:4,end:38,before:'[a](https://x.test/p?utm_source=1)',after:'a'},{start:43,end:77,before:'[b](https://y.test/q?utm_source=2)',after:'b'}]},
   {text:'a b\nc',processed:2,remaining:0,changes:[{start:1,end:3,before:'  ',after:' '},{start:4,end:6,before:'  ',after:''}]},
   {text:'Title\n\nIt is not just bold, but more — really.\n\nVisit our guide for more.\n',processed:6,remaining:2,changes:[{start:0,end:2,before:'# ',after:''},{start:24,end:26,before:'**',after:''},{start:30,end:32,before:'**',after:''},{start:38,end:40,before:'**',after:''},{start:44,end:46,before:'**',after:''},{start:64,end:131,before:'[our guide](https://example.com/guide?utm_source=chatgpt.com&id=42)',after:'our guide'},{start:141,end:142,before:'\u200B',after:''},{start:142,end:144,before:'  ',after:''}]},
  ];
  const trackGoldens=[
   {text:'AB and CD',processed:2,remaining:0,changes:[{start:1,end:2,before:'\u200B',after:''},{start:9,end:10,before:'\u200B',after:''}]},
   {text:'See [a](https://x.test/p) and [b](https://y.test/q).',processed:2,remaining:0,changes:[{start:8,end:37,before:'https://x.test/p?utm_source=1',after:'https://x.test/p'},{start:47,end:76,before:'https://y.test/q?utm_source=2',after:'https://y.test/q'}]},
   {text:'a b\nc',processed:2,remaining:0,changes:[{start:1,end:3,before:'  ',after:' '},{start:4,end:6,before:'  ',after:''}]},
   {text:'# Title\n\nIt is not just **bold**, but **more** — really.\n\nVisit [our guide](https://example.com/guide?id=42) for more.\n',processed:3,remaining:4,changes:[{start:76,end:130,before:'https://example.com/guide?utm_source=chatgpt.com&id=42',after:'https://example.com/guide?id=42'},{start:141,end:142,before:'\u200B',after:''},{start:142,end:144,before:'  ',after:''}]},
  ];
  samples.forEach((text,i)=>{
   const legacy=clean(text,defaultOptions);
   expect(legacy).toEqual(plainGoldens[i]);
   expect(clean(text,defaultOptions,new Set())).toEqual(legacy);
   expect(clean(text,{...defaultOptions,plainText:false})).toEqual(trackGoldens[i]);
  });
 });
});
