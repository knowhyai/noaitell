import { segment, sentences } from './segments';
import { rules } from './rules';
import type { Analysis, Finding, Category, Confidence } from './types';
const make=(ruleId:string,category:Category,confidence:Confidence,start:number,end:number,text:string,label:string,why:string,cleanable:boolean):Finding=>({id:`${ruleId}:${start}:${end}`,ruleId,category,confidence,start,end,text,label,why,cleanable});
const invisible=/[\u200B\u2060\u00AD\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u00A0\u202F]/g;
const spaceLike=/[\u00A0\u202F]/g;
const isEmojiJoiner=(text:string,i:number)=> { const before=[...text.slice(0,i)].at(-1)||''; const after=[...text.slice(i+1)][0]||''; return /\p{Extended_Pictographic}/u.test(before)&&/\p{Extended_Pictographic}/u.test(after); };
function deterministic(text:string, excluded:Array<{start:number;end:number}>):Finding[] { const out:Finding[]=[]; const blocked=(n:number)=>excluded.some(x=>n>=x.start&&n<x.end);
 let m:RegExpExecArray|null;
 while((m=invisible.exec(text))) if(!blocked(m.index)) out.push(make('CHAR01','typography','high',m.index,m.index+m[0].length,m[0],'不可见或特殊空白','不可见字符会干扰复制、搜索或排版；清理时会保留 emoji 组合所需连接符。',true));
 const markdown=[[/^#{1,6}\s+.+/gm,'Markdown heading'],[/\*\*[^*]+\*\*/g,'Markdown bold'],[/^\s*(?:[-*+]\s+|\d+\.\s+)/gm,'Markdown list'],[/`[^`\n]+`/g,'Inline code'],[/^>\s+.+/gm,'Quote marker']];
 for(const [re,label] of markdown as Array<[RegExp,string]>) { while((m=re.exec(text))) if(!blocked(m.index)) out.push(make('MD01','format','high',m.index,m.index+m[0].length,m[0],label,'可见 Markdown 标记可按输出模式清理。',true)); }
 const link=/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g; while((m=link.exec(text))){ try { const u=new URL(m[2]); const tracked=[...u.searchParams.keys()].filter(k=>/^utm_/i.test(k)||['fbclid','gclid'].includes(k.toLowerCase())); if(tracked.length) out.push(make('LINK01','link','high',m.index,m.index+m[0].length,m[0],'Tracking parameters',`链接含 ${tracked.join(', ')}；只会移除已知跟踪参数。`,true)); } catch{} }
 const cite=/\[\d+\]|【†[^】]+】/g; while((m=cite.exec(text))) if(!blocked(m.index)) out.push(make('CITE01','link','medium',m.index,m.index+m[0].length,m[0],'Citation marker','引用标记可能是合法来源，因此只提示、从不自动删除。',false));
 const spaces=/(?: {2,}|\t+|[ \t]+$|\n{3,})/gm; while((m=spaces.exec(text))) if(!blocked(m.index)) out.push(make('WS01','format','high',m.index,m.index+m[0].length,m[0],'Extra whitespace','多余空白可安全合并。',true));
 // Latin/Cyrillic/Greek scripts mixed within one word only.
 const word=/[\p{L}]{2,}/gu; while((m=word.exec(text))){ const s=m[0]; const scripts=[/\p{Script=Latin}/u.test(s),/\p{Script=Cyrillic}/u.test(s),/\p{Script=Greek}/u.test(s)].filter(Boolean).length; if(scripts>1) out.push(make('CHAR02','typography','high',m.index,m.index+s.length,s,'Mixed-script homoglyph','同一单词混入外观相似的不同文字，可能造成误读或欺骗。',true)); }
 // English punctuation only; Chinese curly quotes and —— are intentionally normal.
 const english=text.match(/[A-Za-z]/g)?.length||0, chinese=text.match(/[\u4e00-\u9fff]/g)?.length||0;
 if(english>chinese) { const punct=/[—–“”‘’…]/g; while((m=punct.exec(text))) if(!blocked(m.index)) out.push(make('PUNC01','typography','medium',m.index,m.index+1,m[0],'Typography character','英文发布时可按需统一为直引号、连字符或三个点。',true)); }
 return out;
}
export function analyze(text:string, ignored=new Set<string>()):Analysis {
 const segs=segment(text); const excluded=segs.filter(x=>x.excluded).map(x=>({start:x.start,end:x.end})); const found=deterministic(text,excluded);
 for(const s of segs.filter(x=>!x.excluded)) for(const sentence of sentences(s.text,s.start)) for(const r of rules.filter(r=>r.enabled&&r.language===sentence.language)) for(const hit of r.matcher(sentence.text)) {
   const start=sentence.start+hit.start,end=sentence.start+hit.end; if(!/^\s*(?:综上所述|总而言之|总的来看|不难发现)/.test(sentence.text)||r.id!=='ZH06'||s.end===text.length) found.push(make(r.id,'pattern',r.confidence,start,end,text.slice(start,end),hit.label,`${start+1} → ${hit.label}：${r.description}`,false));
 }
 const unique=[...new Map(found.map(x=>[`${x.start}:${x.end}:${x.ruleId}`,x])).values()].map(x=>({...x,ignored:ignored.has(x.id)})); const active=unique.filter(x=>!x.ignored);
 const visible=text.replace(/```[\s\S]*?```/g,'').replace(invisible,'').replace(/\s/g,'').length; const patternHits=active.filter(x=>x.category==='pattern').length, formatHits=active.filter(x=>x.category==='format').length, reviewCount=active.filter(x=>!x.cleanable).length, invisibleCount=active.filter(x=>x.ruleId==='CHAR01').length;
 return {findings:unique,visibleChars:visible,patternHits,formatHits,reviewCount,invisibleCount,density:visible>=150?Math.round(patternHits/visible*1000*10)/10:null};
}
export function emojiSafeInvisible(text:string):string { return text.replace(spaceLike,' ').replace(/[\u200B\u2060\u00AD\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u200C\u200D]/g,(c,i)=> (c==='\u200D'||c==='\u200C')&&isEmojiJoiner(text,i)?c:''); }
