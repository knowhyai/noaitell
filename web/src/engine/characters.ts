export const invisible = /[\u200B\u2060\u00AD\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u200C\u200D\u00A0\u202F\u2000-\u200A\u3000]/g;

export function meaningfulJoiner(text: string, index: number): boolean {
  const before = [...text.slice(0, index)];
  const after = [...text.slice(index + 1)];
  const modifier = /[\p{M}\p{Emoji_Modifier}]/u;
  while (before.length && modifier.test(before.at(-1)!)) before.pop();
  while (after.length && modifier.test(after[0])) after.shift();
  const neighbor = /[\p{L}\p{Extended_Pictographic}\p{S}]/u;
  return neighbor.test(before.at(-1) || '') && neighbor.test(after[0] || '');
}

export function emojiSafeInvisible(text: string): string {
  return text.replace(invisible, (char, index: number) => {
    if ((char === '\u200C' || char === '\u200D') && meaningfulJoiner(text, index)) return char;
    return /^[\u00A0\u202F\u2000-\u200A\u3000]$/.test(char) ? ' ' : '';
  });
}

export function mixedWord(word: string): boolean {
  return [/\p{Script=Latin}/u, /\p{Script=Cyrillic}/u, /\p{Script=Greek}/u].filter(script => script.test(word)).length > 1;
}

const homoglyphs: Record<string, string> = {
  А: 'A', В: 'B', Е: 'E', І: 'I', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', Х: 'X',
  а: 'a', Ь: 'b', с: 'c', һ: 'h', е: 'e', і: 'i', ј: 'j', о: 'o', р: 'p', ѕ: 's', х: 'x', у: 'y',
};

export function normaliseHomoglyph(word: string): string {
  return mixedWord(word) ? [...word].map(char => homoglyphs[char] || char).join('') : word;
}

export const normalizePunctuation = (text: string): string => text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/[—–]/g, '-');

// Numeric/mathematical lines may use > or - as operators rather than markup.
export const mathematical = (text: string): boolean => !/\p{L}/u.test(text) && /[\p{N}\p{Sm}]/u.test(text);
