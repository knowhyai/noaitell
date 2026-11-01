import type { Language, Segment } from './types';
import { bareUrlRanges, markdownLinks } from './links';

export function detectLanguage(text: string): Language {
  const chinese = text.match(/[\u3400-\u9fff]/g)?.length || 0;
  const latin = text.match(/\p{Script=Latin}/gu)?.length || 0;
  return chinese > latin ? 'zh' : 'en';
}

export function segment(text: string): Segment[] {
  const parts: Segment[] = [];
  const links = markdownLinks(text);
  const opening = /^ {0,3}(?:`{3,}|~{3,})[^\n]*$|^ {0,3}>[^\n]*$|`+|\[/gm;
  let at = 0, match: RegExpExecArray | null;
  const push = (start: number, end: number, excluded = false, kind?: Segment['kind'], codeStyle?: Segment['codeStyle']) => {
    if (end > start) {
      const value = text.slice(start, end);
      parts.push({ start, end, text: value, language: detectLanguage(value), excluded, kind, codeStyle });
    }
  };
  while ((match = opening.exec(text))) {
    const start = match.index;
    let end = opening.lastIndex, kind: Segment['kind'], codeStyle: Segment['codeStyle'];
    const fence = /^ {0,3}(`{3,}|~{3,})/.exec(match[0]);
    if (fence) {
      const closing = new RegExp(`^ {0,3}${fence[1][0]}{${fence[1].length},}[ \\t]*\\r?$`, 'gm');
      closing.lastIndex = end;
      const close = closing.exec(text);
      end = close ? close.index + close[0].length : text.length;
      kind = 'code';
      codeStyle = 'fenced';
    } else if (/^ {0,3}>/.test(match[0])) {
      kind = 'quote';
    } else if (match[0][0] === '`') {
      const closing = /`+/g;
      closing.lastIndex = end;
      let close: RegExpExecArray | null;
      while ((close = closing.exec(text)) && close[0].length !== match[0].length) { /* find matching run */ }
      if (!close || text.slice(end, close.index).includes('\n')) continue;
      end = close.index + close[0].length;
      kind = 'code';
      codeStyle = 'inline';
    } else {
      const link = links.find(link => link.start === start);
      if (!link) continue;
      end = link.end;
      kind = 'link';
    }
    push(at, start);
    push(start, end, true, kind, codeStyle);
    at = end;
    opening.lastIndex = end;
  }
  push(at, text.length);
  return parts;
}

export function sentences(text: string, offset: number): Array<{ text: string; start: number; language: Language }> {
  const result: Array<{ text: string; start: number; language: Language }> = [];
  const urls = bareUrlRanges(text);
  let start = 0;
  const push = (end: number) => {
    const value = text.slice(start, end);
    if (value.trim()) result.push({ text: value, start: offset + start, language: detectLanguage(value) });
    start = end;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\n') { push(i + 1); continue; }
    if (!/[.!?。！？]/.test(char)) continue;
    if (char === '.' && /\d/.test(text[i - 1] || '') && /\d/.test(text[i + 1] || '')) continue;
    if (urls.some(url => i >= url.start && i < url.end)) continue;
    // Keep closing quotes with their sentence, so their language is consistent.
    while (/["'”’」』）)]/.test(text[i + 1] || '\0')) i++;
    push(i + 1);
  }
  push(text.length);
  return result;
}
