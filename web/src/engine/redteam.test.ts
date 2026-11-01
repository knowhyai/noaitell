import { describe, expect, it } from 'vitest';
import { analyze } from './detect';
import { clean, defaultOptions } from './clean';
import { segment, sentences } from './segments';
import type { CleanOptions } from './types';

const only = (selected: Partial<CleanOptions>): CleanOptions => ({
  invisible: false, markdown: false, typography: false, tracking: false,
  whitespace: false, homoglyph: false, plainText: false, ...selected,
});
const hits = (text: string, ruleId: string) => analyze(text).findings.filter(f => f.ruleId === ruleId);

describe('red-team acceptance regressions', () => {
  it('preserves all text when every cleaning option is disabled', () => {
    const text = '# A\u200BB “quote”\n**bold**\n[x](https://example.com?utm_source=x)\n- 10\n`cоnst`';
    expect(clean(text, only({}))).toEqual({ text, processed: 0, remaining: analyze(text).findings.length, changes: [] });
  });
  it('F1: cleans prose while leaving exempt contents and link targets intact', () => {
    const protectedText = '```js\n  const cоnst = "a\u200Bb  c—d";\n```\n`a\u200Bb  cоnst—d`\n> a\u200Bb  cоnst—d\n[x](https://example.com/a—b?value=cоnst)';
    const options = { ...defaultOptions, typography: true, homoglyph: true, plainText: false };
    expect(clean(`A\u200BB  C—D\n${protectedText}`, options).text).toBe(`AB C-D\n${protectedText}`);
  });
  it('F2: skips tracked links inside fenced code', () => {
    expect(hits('```\n[x](https://example.com?utm_source=test)\n```', 'LINK01')).toHaveLength(0);
    const protectedText = '`[x](https://example.com?utm_source=test)`\n   > [x](https://example.com?utm_source=test)';
    expect(hits(protectedText, 'LINK01')).toHaveLength(0);
    expect(clean(protectedText, only({ tracking: true })).text).toBe(protectedText);
  });
  it('F3: excludes tilde fences and quote lines indented by up to three spaces', () => {
    const text = '~~~ts\nnot just a tool, but a platform\n~~~\n   > not just a tool, but a platform';
    expect(segment(text).filter(s => s.excluded).map(s => s.kind)).toEqual(['code', 'quote']);
    expect(analyze(text).findings).toHaveLength(0);
  });
  it.each(['```ts', '~~~', '   ~~~~ts\r\n  a\u200Bb  cоnst—d\r\n   ~~~~', '````\n```\n  x\u200By\n````'])('F1/F3: preserves unclosed and longer fences: %j', text => {
    expect(clean(text, { ...defaultOptions, typography: true, homoglyph: true }).text).toBe(text);
    expect(analyze(text).findings).toHaveLength(0);
  });
  it('F1: plain-text projection preserves inline-code and quote contents exactly', () => {
    const text = '`a\u200Bb  cоnst—d`\n> a\u200Bb  cоnst—d';
    expect(clean(text, { ...defaultOptions, typography: true, homoglyph: true }).text).toBe('a\u200Bb  cоnst—d\na\u200Bb  cоnst—d');
  });
  it.each(['❤️‍🔥', '🏳️‍🌈', '👩🏽‍💻', 'می\u200Cروم', 'العربية\u200Cلغة', 'a\u200Db'])('F4: preserves meaningful joiners in %s', text => {
    expect(clean(text, only({ invisible: true })).text).toBe(text);
  });
  it('F4: detects and removes isolated joiners without changing emoji', () => {
    const text = 'A \u200D B \u200C C ❤️‍🔥';
    expect(hits(text, 'CHAR01')).toHaveLength(2);
    expect(clean(text, only({ invisible: true })).text).toBe('A  B  C ❤️‍🔥');
  });
  it('F5: only flags the final body paragraph, even before excluded tails', () => {
    expect(hits('综上所述，第一段结束。\n\n第二段讲些内容。', 'ZH06')).toHaveLength(0);
    const body = '正文第一段，讲些内容。\n\n综上所述，本文到此结束。';
    for (const tail of ['', "\n\n```\nconsole.log('demo');\n```", '\n\n> 引用结尾', '\n\n~~~\ncode\n~~~']) {
      const found = hits(body + tail, 'ZH06');
      expect(found).toHaveLength(1);
      expect(found[0].start).toBe(body.indexOf('综上所述'));
    }
  });
  it('F6: uses the dominant sentence language despite a stray CJK character', () => {
    expect(hits('It is not just a 文 tool, but a platform for writers.', 'EN01')).toHaveLength(1);
    expect(hits('这不仅是一个 AI 工具，更是新的工作方式。', 'ZH01')).toHaveLength(1);
  });
  it('F7: detects and cleans punctuation only in English-dominant sentences', () => {
    const chinese = '他说：“综上所述——这是一句完整的中文”。';
    const text = `This is a very long English sentence about writing and publishing. ${chinese}`;
    expect(hits(chinese, 'PUNC01')).toHaveLength(0);
    expect(hits(text, 'PUNC01')).toHaveLength(0);
    expect(clean(text, only({ typography: true })).text).toBe(text);
    expect(clean(`English “quotes”—work. ${chinese}`, only({ typography: true })).text).toBe(`English "quotes"-work. ${chinese}`);
    const withCode = `他说：“中文——标点”\`${'English'.repeat(100)}\`。`;
    expect(hits(withCode, 'PUNC01')).toHaveLength(0);
  });
  it('F8: normalizes mixed words while preserving pure Cyrillic and Greek words', () => {
    expect(clean('СОР Привет ΑΒΓ pаypal', only({ homoglyph: true })).text).toBe('СОР Привет ΑΒΓ paypal');
  });
  it('F9: counts only visible prose outside exempt Markdown regions', () => {
    const prose = '正文只有十个可见字符。';
    const text = `${prose}\n\n\`${'x'.repeat(300)}\`\n> ${'引用'.repeat(100)}\n\n~~~\ncode\n~~~`;
    expect(analyze(text).visibleChars).toBe(prose.length);
    expect(analyze('[这里](https://example.com/very-long-url)').visibleChars).toBe(2);
    expect(analyze('A\u200BB').visibleChars).toBe(2);
  });
  it.each(Array.from({ length: 11 }, (_, i) => String.fromCharCode(0x2000 + i)).concat(['\u3000']))('F10: normalizes space-like %j', space => {
    expect(hits(`a${space}b`, 'CHAR01')).toHaveLength(1);
    expect(clean(`a${space}b`, only({ invisible: true })).text).toBe('a b');
  });
  it('F11: counts all output findings as remaining, including unselected cleanable ones', () => {
    const text = 'English “quotes”. A\u200BB';
    const result = clean(text, only({ invisible: true }));
    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(2);
    expect(result.remaining).toBe(analyze(result.text).findings.length);
    expect(clean(text, only({})).processed).toBe(0);
    expect(clean('> 5', defaultOptions).processed).toBe(0);
    const overlapping = clean('#  Heading', defaultOptions);
    expect(overlapping.text).toBe('Heading');
    expect(overlapping.processed).toBe(2);
    expect(overlapping.remaining).toBe(0);
    const whitespaceOnly = clean('#  Heading', only({ whitespace: true }));
    expect(whitespaceOnly.processed).toBe(1);
    expect(whitespaceOnly.remaining).toBe(1);
  });
  it('F12: skips homoglyphs inside inline and fenced code', () => {
    expect(hits('`cоnst`\n\n```\npаypal\n```', 'CHAR02')).toHaveLength(0);
  });
  it.each([
    ['It is not about AI at v1.0.5, it is about detection algorithms.', 'EN02'],
    ['It is not just a $3.14 tool, but a platform for writers.', 'EN01'],
    ['It is not just example.com/a, but a platform for writers.', 'EN01'],
    ['It is not just https://example.com/a.b?x=1.2, but a platform for writers.', 'EN01'],
  ])('F13: keeps decimals, versions and URLs inside sentences: %s', (text, ruleId) => {
    expect(sentences(text, 0)).toHaveLength(1);
    expect(hits(text, ruleId)).toHaveLength(1);
  });
  it('F14: shares balanced-parenthesis links across detection and both output modes', () => {
    const url = 'https://en.wikipedia.org/wiki/Tree_(data_structure)';
    const text = `[这里](${url})`;
    expect(clean(text, { ...defaultOptions, plainText: false }).text).toBe(text);
    expect(clean(text, defaultOptions).text).toBe('这里');
    const tracked = `[这里](${url}?utm_source=test&id=2)`;
    expect(hits(tracked, 'LINK01')).toHaveLength(1);
    expect(hits(tracked, 'LINK01')[0].text).toBe(tracked);
    expect(clean(tracked, { ...defaultOptions, plainText: false }).text).toBe(`[这里](${url}?id=2)`);
    expect(clean(tracked, defaultOptions).text).toBe('这里');
    const nested = '[label](https://example.com/a_(b_(c))?id=a%20b&utm_source=x#section)';
    expect(clean(nested, { ...defaultOptions, plainText: false }).text).toBe('[label](https://example.com/a_(b_(c))?id=a%20b#section)');
    expect(clean(nested, defaultOptions).text).toBe('label');
    expect(clean('[label](https://example.com/(unclosed)', defaultOptions).text).toBe('[label](https://example.com/(unclosed)');
  });
  it('F15: collapses one or more mid-line tabs to one space', () => {
    for (const tabs of ['\t', '\t\t', ' \t ']) {
      const result = clean(`The word${tabs}spacing is weird.`, only({ whitespace: true }));
      expect(result.text).toBe('The word spacing is weird.');
      expect(hits(result.text, 'WS01')).toHaveLength(0);
    }
  });
  it('F16: keeps list indentation and mathematical markers in prose context', () => {
    expect(clean('- Root item\n  - Child item\n  - Child two', defaultOptions).text).toBe('Root item\n  Child item\n  Child two');
    const text = 'We compare the following values:\n> 5\n- 10\n  > 2 + 3\n  - 1.5\n- ∞';
    expect(clean(text, defaultOptions).text).toBe(text);
    expect(clean('  > Quoted words', defaultOptions).text).toBe('  Quoted words');
  });
  it('F17: separates words when removing emphasis or inline-code delimiters', () => {
    const text = 'hello**world** this is inlineCode test [linkText](https://example.com?utm_source=test)';
    expect(clean(text, defaultOptions).text).toBe('hello world this is inlineCode test linkText');
    expect(clean('hello`world`again', defaultOptions).text).toBe('hello world again');
    expect(clean('**bold** punctuation.', defaultOptions).text).toBe('bold punctuation.');
  });
  it('F18: returns distinct, adjacent ZH04 ranges', () => {
    const text = '在当今快速发展的时代，在当今快速发展的时代，同一段重复两次相同句式。';
    const found = hits(text, 'ZH04');
    expect(found).toHaveLength(2);
    expect(found.map(f => text.slice(f.start, f.end))).toEqual(['在当今快速发展的时代', '在当今快速发展的时代']);
    expect(found[0].end).toBeLessThan(found[1].start);
  });
  it('never rewrites pattern-only findings or removes citations', () => {
    const text = 'It is not just a tool, but a platform.\n综上所述，这不仅是工具，更是平台。 [1]';
    const result = clean(text, { ...defaultOptions, typography: true, homoglyph: true });
    expect(result.text).toBe(text);
    expect(result.processed).toBe(0);
    expect(result.remaining).toBe(analyze(text).findings.length);
  });
  it('reports applied edits at original UTF-16 offsets', () => {
    const text = '👩🏽‍💻 A\u200BB\u200BC “quotes”.';
    const result = clean(text, only({ invisible: true, typography: true }));
    let reconstructed = text;
    for (const change of [...result.changes].reverse()) {
      expect(text.slice(change.start, change.end)).toBe(change.before);
      reconstructed = reconstructed.slice(0, change.start) + change.after + reconstructed.slice(change.end);
    }
    expect(reconstructed).toBe(result.text);
    expect(result.processed).toBe(4);
    expect(result.remaining).toBe(0);
  });
});
