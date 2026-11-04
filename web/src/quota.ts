export const QUOTA_KEY = 'noaitell:quota:v1';
export const DAILY_LIMIT = 3;
export const WORD_LIMIT = 500;
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export function dayKey(now = new Date()): string {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('-');
}
export function countWords(text: string): number {
  return [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)].filter(s => s.isWordLike).length;
}
export function usedToday(store: Store, now = new Date()): number {
  try {
    const record = JSON.parse(store.getItem(QUOTA_KEY) || 'null');
    return record?.day === dayKey(now) && Number.isInteger(record.used) && record.used >= 0 ? Math.min(record.used, DAILY_LIMIT) : 0;
  } catch { return 0; }
}
export function consumeUse(text: string, store: Store, now = new Date()): { ok: boolean; message: string } {
  if (!text.trim()) return { ok: false, message: 'Paste some text first.' };
  if (countWords(text) > WORD_LIMIT) return { ok: false, message: 'Free cleaning supports up to 500 words per use.' };
  const used = usedToday(store, now);
  if (used >= DAILY_LIMIT) return { ok: false, message: 'You have used today’s 3 free cleanings. Come back tomorrow.' };
  try { store.setItem(QUOTA_KEY, JSON.stringify({ day: dayKey(now), used: used + 1 })); }
  catch { return { ok: false, message: 'Enable local storage to use the free daily quota.' }; }
  return { ok: true, message: `${DAILY_LIMIT - used - 1} free uses left today.` };
}
export function deviceStore(): Store {
  // The quota contains a date and count only, never source text.
  try { return localStorage; } catch { return { getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); } }; }
}
