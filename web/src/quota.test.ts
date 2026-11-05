import { describe, expect, it } from 'vitest';
import { consumeUse, countWords, dayKey, QUOTA_KEY, usedToday } from './quota';
const date = new Date(2026, 10, 4, 12);
function storage() { const data = new Map<string,string>(); return { getItem:(k:string)=>data.get(k)??null, setItem:(k:string,v:string)=>{data.set(k,v);} }; }
describe('device quota', () => {
 it('persists three uses across clients and resets at local midnight', () => {
  const store=storage();
  for(let i=0;i<3;i++) expect(consumeUse('A draft',store,date).ok).toBe(true);
  expect(usedToday(store,date)).toBe(3);
  expect(consumeUse('A draft',store,date).ok).toBe(false);
  expect(consumeUse('A draft',store,new Date(2026,10,5,0)).ok).toBe(true);
  expect(usedToday(store,new Date(2026,10,5,0))).toBe(1);
 });
 it('allows exactly 500 words and does not charge invalid input', () => {
  const store=storage();
  expect(consumeUse('',store,date).ok).toBe(false);
  expect(consumeUse('word '.repeat(501),store,date).ok).toBe(false);
  expect(usedToday(store,date)).toBe(0);
  expect(consumeUse('word '.repeat(500),store,date).ok).toBe(true);
  expect(countWords('hello, world!')).toBe(2);
  expect(countWords('中文测试')).toBeGreaterThan(0);
 });
 it('handles malformed records and unavailable storage without storing drafts', () => {
  const store=storage(); store.setItem(QUOTA_KEY,'broken');
  expect(usedToday(store,date)).toBe(0);
  store.setItem(QUOTA_KEY,JSON.stringify({day:dayKey(date),used:-1}));
  expect(usedToday(store,date)).toBe(0);
  consumeUse('private draft',store,date);
  expect(store.getItem(QUOTA_KEY)).not.toContain('private draft');
  expect(consumeUse('draft',{getItem:()=>null,setItem:()=>{throw Error();}},date).ok).toBe(false);
 });
});
