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
});
