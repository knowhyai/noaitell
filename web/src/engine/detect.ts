import { segment, sentences } from './segments';
import { rules } from './rules';
import { invisible, meaningfulJoiner, mixedWord, mathematical } from './characters';
import { markdownLinks, trackingKeys } from './links';
import type { Analysis, Finding, Category, Confidence } from './types';
export { emojiSafeInvisible } from './characters';

const make = (ruleId: string, category: Category, confidence: Confidence, start: number, end: number, text: string, label: string, why: string, cleanable: boolean): Finding => ({
  id: `${ruleId}:${start}:${end}`, ruleId, category, confidence, start, end, text, label, why, cleanable,
});

function deterministic(text: string, excluded: Array<{ start: number; end: number; kind?: string }>): Finding[] {
  const out: Finding[] = [];
  const blocked = (start: number, end = start + 1, allowLink = false) => excluded.some(x => (!allowLink || x.kind !== 'link') && start < x.end && end > x.start);
  for (const match of text.matchAll(invisible)) {
    const char = match[0], start = match.index;
    if (blocked(start)) continue;
    if ((char === '\u200C' || char === '\u200D') && meaningfulJoiner(text, start)) continue;
    out.push(make('CHAR01', 'typography', 'high', start, start + char.length, char, '不可见或特殊空白', '不可见字符会干扰复制、搜索或排版；保留字母或图形组合所需连接符。', true));
  }
  const markdown: Array<[RegExp, string]> = [
    [/^ {0,3}#{1,6}[ \t]+.+/gm, 'Markdown heading'],
    [/\*\*[^*\n]+\*\*/g, 'Markdown bold'],
    [/^[ \t]*(?:[-*+][ \t]+|\d+\.[ \t]+)/gm, 'Markdown list'],
  ];
  for (const [re, label] of markdown) {
    for (const match of text.matchAll(re)) {
      const start = match.index, end = start + match[0].length;
      if (blocked(start)) continue;
      const lineEnd = text.indexOf('\n', end);
      if (label === 'Markdown list' && mathematical(text.slice(end, lineEnd < 0 ? text.length : lineEnd))) continue;
      out.push(make('MD01', 'format', 'high', start, end, match[0], label, '可见 Markdown 标记可按输出模式清理。', true));
    }
  }
  for (const link of markdownLinks(text)) {
    if (blocked(link.start, link.end, true)) continue;
    const tracked = trackingKeys(link.url);
    if (tracked.length) out.push(make('LINK01', 'link', 'high', link.start, link.end, text.slice(link.start, link.end), 'Tracking parameters', `链接含 ${tracked.join(', ')}；只会移除已知跟踪参数。`, true));
  }
  for (const match of text.matchAll(/\[\d+\]|【†[^】]+】/g)) {
    if (!blocked(match.index)) out.push(make('CITE01', 'link', 'medium', match.index, match.index + match[0].length, match[0], 'Citation marker', '引用标记可能是合法来源，因此只提示、从不自动删除。', false));
  }
  for (const match of text.matchAll(/(?:[ \t]+$|[ \t]{2,}|\t+|\n{3,})/gm)) {
    const start = match.index, end = start + match[0].length;
    if (blocked(start, end)) continue;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    // Leading indentation is meaningful for nested lists and is never flattened.
    if (!match[0].includes('\n') && /^[ \t]*$/.test(text.slice(lineStart, start)) && end < text.length && text[end] !== '\n') continue;
    out.push(make('WS01', 'format', 'high', start, end, match[0], 'Extra whitespace', '多余空白可安全合并，保留行首缩进。', true));
  }
  for (const match of text.matchAll(/[\p{L}\p{M}]{2,}/gu)) {
    const start = match.index, end = start + match[0].length;
    if (!blocked(start, end) && mixedWord(match[0])) out.push(make('CHAR02', 'typography', 'high', start, end, match[0], 'Mixed-script homoglyph', '同一单词混入外观相似的不同文字，可能造成误读或欺骗。', true));
  }
  // Exempt contents must not change the language of surrounding prose.
  let body = '', at = 0;
  for (const part of excluded) {
    body += text.slice(at, part.start) + text.slice(part.start, part.end).replace(/[^\n]/g, ' ');
    at = part.end;
  }
  body += text.slice(at);
  for (const sentence of sentences(body, 0)) {
    if (sentence.language !== 'en') continue;
    for (const match of sentence.text.matchAll(/[—–“”‘’…]/g)) {
      const start = sentence.start + match.index;
      if (!blocked(start)) out.push(make('PUNC01', 'typography', 'medium', start, start + 1, match[0], 'Typography character', '英文发布时可按需统一为直引号、连字符或三个点。', true));
    }
  }
  return out;
}

export function analyze(text: string, ignored = new Set<string>()): Analysis {
  const segs = segment(text);
  const excluded = segs.filter(s => s.excluded);
  const found = deterministic(text, excluded);
  // Mask rather than remove exemptions, preserving paragraph boundaries and offsets.
  const body = segs.map(s => s.excluded ? s.text.replace(/[^\n]/g, ' ') : s.text).join('');
  let lastParagraph = 0;
  for (const paragraph of body.matchAll(/[^\n]+(?:\n(?![ \t]*\n)[^\n]+)*/g)) {
    if (paragraph[0].trim()) lastParagraph = paragraph.index;
  }
  for (const part of segs.filter(s => !s.excluded)) {
    for (const sentence of sentences(part.text, part.start)) {
      for (const rule of rules.filter(r => r.enabled && r.language === sentence.language)) {
        for (const hit of rule.matcher(sentence.text)) {
          const start = sentence.start + hit.start, end = sentence.start + hit.end;
          if (rule.id === 'ZH06' && start < lastParagraph) continue;
          found.push(make(rule.id, 'pattern', rule.confidence, start, end, text.slice(start, end), hit.label, `${start + 1} → ${hit.label}：${rule.description}`, false));
        }
      }
    }
  }
  const unique = [...new Map(found.map(f => [`${f.start}:${f.end}:${f.ruleId}`, f])).values()].map(f => ({ ...f, ignored: ignored.has(f.id) }));
  const active = unique.filter(f => !f.ignored);
  const visible = segs.reduce((count, s) => {
    // Link labels remain visible; their URL and Markdown syntax do not.
    const value = s.kind === 'link' ? markdownLinks(s.text)[0].label : s.excluded ? '' : s.text;
    return count + [...value.replace(invisible, '').replace(/\s/g, '')].length;
  }, 0);
  const patternHits = active.filter(f => f.category === 'pattern').length;
  const formatHits = active.filter(f => f.category === 'format').length;
  const reviewCount = active.filter(f => !f.cleanable).length;
  const invisibleCount = active.filter(f => f.ruleId === 'CHAR01').length;
  return { findings: unique, visibleChars: visible, patternHits, formatHits, reviewCount, invisibleCount, density: visible >= 150 ? Math.round(patternHits / visible * 1000 * 10) / 10 : null };
}
