export interface MarkdownLink {
  start: number;
  end: number;
  label: string;
  url: string;
  urlStart: number;
  urlEnd: number;
}

// One parser for exemptions, tracking checks and plain-text label extraction.
export function markdownLinks(text: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  const opening = /\[((?:\\.|[^\]\\\n])*)\]\(/g;
  let match: RegExpExecArray | null;
  while ((match = opening.exec(text))) {
    const urlStart = opening.lastIndex;
    let depth = 1, end = urlStart;
    for (; end < text.length; end++) {
      const char = text[end];
      if (char === '\n' || /\s/.test(char)) break;
      if (char === '\\') { end++; continue; }
      if (char === '(') depth++;
      if (char === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) continue;
    links.push({ start: match.index, end: end + 1, label: match[1], url: text.slice(urlStart, end), urlStart, urlEnd: end });
    opening.lastIndex = end + 1;
  }
  return links;
}

export const isTrackingKey = (key: string): boolean => /^utm_/i.test(key) || ['fbclid', 'gclid'].includes(key.toLowerCase());

export function trackingKeys(url: string): string[] {
  try {
    if (!/^https?:\/\//i.test(url)) return [];
    return [...new URL(url).searchParams.keys()].filter(isTrackingKey);
  } catch { return []; }
}

export function stripTracking(url: string): string {
  if (!trackingKeys(url).length) return url;
  // Preserve the spelling, escaping, parentheses and functional parameter values.
  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#', queryStart);
  const queryEnd = hashStart < 0 ? url.length : hashStart;
  const query = url.slice(queryStart + 1, queryEnd).split('&').filter(part => {
    const key = new URLSearchParams(part).keys().next().value;
    return key === undefined || !isTrackingKey(key);
  }).join('&');
  return url.slice(0, queryStart) + (query ? `?${query}` : '') + url.slice(queryEnd);
}

export function bareUrlRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const url = /(?:https?:\/\/|www\.)[^\s<>"`]+|\b(?:[a-z\d-]+\.)+[a-z]{2,}(?:[/?#][^\s<>"`]*)?/gi;
  for (const match of text.matchAll(url)) {
    const value = match[0].replace(/[.!?。！？,;:]+$/, '');
    ranges.push({ start: match.index, end: match.index + value.length });
  }
  return ranges;
}
