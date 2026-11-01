import { analyze, emojiSafeInvisible } from './detect';
import { mathematical, normaliseHomoglyph, normalizePunctuation } from './characters';
import { markdownLinks, stripTracking } from './links';
import { segment } from './segments';
import type { CleanOptions, CleanResult } from './types';

export const defaultOptions: CleanOptions = { invisible: true, markdown: true, typography: false, tracking: true, whitespace: true, homoglyph: false, plainText: true };

export function clean(original: string, options: CleanOptions): CleanResult {
  type Edit = CleanResult['changes'][number] & { ruleIds: string[] };
  const edits: Edit[] = [];
  const findings = analyze(original).findings;
  const parts = segment(original);
  const plain = options.markdown && options.plainText;
  const add = (start: number, end: number, after: string, ruleIds: string[]) => {
    const before = original.slice(start, end);
    if (before !== after) edits.push({ start, end, before, after, ruleIds });
  };
  const wordChar = (char: string) => /[\p{L}\p{N}\p{M}_]/u.test(char);
  // Removing a delimiter must not join the words on either side of it.
  const removeDelimiter = (start: number, end: number) => {
    const before = [...original.slice(0, start)].at(-1) || '';
    const after = [...original.slice(end)][0] || '';
    add(start, end, wordChar(before) && wordChar(after) ? ' ' : '', ['MD01']);
  };

  // Deterministic edits use exactly the same exempt ranges and language decisions
  // as detection. All coordinates refer to the original input, avoiding drift.
  for (const finding of findings) {
    const { ruleId, start, end, text } = finding;
    if (ruleId === 'CHAR01' && options.invisible) add(start, end, emojiSafeInvisible(text), [ruleId]);
    if (ruleId === 'PUNC01' && options.typography) add(start, end, normalizePunctuation(text), [ruleId]);
    if (ruleId === 'CHAR02' && options.homoglyph) add(start, end, normaliseHomoglyph(text), [ruleId]);
    if (ruleId === 'WS01' && options.whitespace) {
      const after = text.includes('\n') ? '\n\n' : end === original.length || original[end] === '\n' || original[end] === '\r' ? '' : ' ';
      add(start, end, after, [ruleId]);
    }
  }
  for (const part of parts) {
    if (part.kind === 'link') {
      const link = markdownLinks(part.text)[0];
      if (plain) {
        const before = [...original.slice(0, part.start)].at(-1) || '';
        const after = [...original.slice(part.end)][0] || '';
        const label = (wordChar(before) && wordChar(link.label[0] || '') ? ' ' : '') + link.label + (wordChar(link.label.at(-1) || '') && wordChar(after) ? ' ' : '');
        add(part.start, part.end, label, ['MD01', 'LINK01']);
      } else if (options.tracking) {
        add(part.start + link.urlStart, part.start + link.urlEnd, stripTracking(link.url), ['LINK01']);
      }
      continue;
    }
    if (!plain) continue;
    if (part.excluded) {
      // Explicit plain-text projection removes wrappers only; protected contents
      // are never sent through typography, whitespace or character transforms.
      if (part.kind === 'quote') {
        const marker = /^( {0,3})>[ \t]?/.exec(part.text)!;
        if (!mathematical(part.text.slice(marker[0].length))) add(part.start + marker[1].length, part.start + marker[0].length, '', ['MD01']);
      } else if (part.codeStyle === 'inline') {
        const delimiter = /^`+/.exec(part.text);
        if (delimiter) {
          removeDelimiter(part.start, part.start + delimiter[0].length);
          removeDelimiter(part.end - delimiter[0].length, part.end);
        }
      }
      continue;
    }
    for (const match of part.text.matchAll(/^( {0,3})#{1,6}[ \t]+|^([ \t]*)(?:[-*+][ \t]+|\d+\.[ \t]+)/gm)) {
      const start = part.start + match.index;
      // A segment beginning after inline code/link is not a new physical line.
      if (start > 0 && original[start - 1] !== '\n') continue;
      const end = start + match[0].length;
      const lineEnd = original.indexOf('\n', end);
      if (match[2] !== undefined && mathematical(original.slice(end, lineEnd < 0 ? original.length : lineEnd))) continue;
      add(start + (match[1] ?? match[2]).length, end, '', ['MD01']);
    }
    for (const match of part.text.matchAll(/\*\*([^*\n]+)\*\*/g)) {
      const start = part.start + match.index, end = start + match[0].length;
      removeDelimiter(start, start + 2);
      removeDelimiter(end - 2, end);
    }
  }
  const ordered = edits.sort((a, b) => a.start - b.start || a.end - b.end);
  let text = '', at = 0;
  const applied: Edit[] = [];
  for (const edit of ordered) {
    if (edit.start < at) continue;
    text += original.slice(at, edit.start) + edit.after;
    at = edit.end;
    applied.push(edit);
  }
  text += original.slice(at);
  const processed = findings.filter(f => f.cleanable && applied.some(edit =>
    (edit.ruleIds.includes(f.ruleId) && edit.start < f.end && edit.end > f.start) ||
    // A removed marker can also contain an entire whitespace finding.
    (edit.after === '' && edit.start <= f.start && edit.end >= f.end)
  )).length;
  const remaining = analyze(text).findings.length;
  return { text, processed, remaining, changes: applied.map(({ ruleIds: _ruleIds, ...edit }) => edit) };
}
