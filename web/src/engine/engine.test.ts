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
});
