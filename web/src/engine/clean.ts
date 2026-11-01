import { analyze, emojiSafeInvisible } from './detect';
import type { CleanOptions, CleanResult } from './types';
export const defaultOptions:CleanOptions={invisible:true,markdown:true,typography:false,tracking:true,whitespace:true,homoglyph:false,plainText:true};
const normaliseHomoglyph=(s:string)=>s.replace(/[АВЕІКМНОРСТХаЬсһеіјорѕху]/g,c=>({А:'A',В:'B',Е:'E',І:'I',К:'K',М:'M',Н:'H',О:'O',Р:'P',С:'C',Т:'T',Х:'X',а:'a',Ь:'b',с:'c',һ:'h',е:'e',і:'i',ј:'j',о:'o',р:'p',ѕ:'s',х:'x',у:'y'}[c]||c));
export function clean(original:string, options:CleanOptions):CleanResult { let text=original; const changes:CleanResult['changes']=[]; const change=(next:string)=>{if(next!==text){changes.push({start:0,end:text.length,before:text,after:next});text=next;}};
 if(options.invisible) change(emojiSafeInvisible(text));
 if(options.tracking) change(text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>{try{const u=new URL(url); [...u.searchParams.keys()].forEach(k=>{if(/^utm_/i.test(k)||['fbclid','gclid'].includes(k.toLowerCase()))u.searchParams.delete(k)});return `[${label}](${u.toString()})`;}catch{return _;}}));
 if(options.markdown&&options.plainText) change(text.replace(/^#{1,6}\s+/gm,'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/`([^`]+)`/g,'$1').replace(/^>\s?/gm,'').replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/gm,'').replace(/\[([^\]]+)\]\(([^)]+)\)/g,'$1'));
 if(options.typography) change(text.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/…/g,'...').replace(/[—–]/g,'-'));
 if(options.whitespace) change(text.replace(/[ \t]+$/gm,'').replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n'));
 if(options.homoglyph) change(normaliseHomoglyph(text));
 const selected=(ruleId:string,findingText:string)=> ({CHAR01:options.invisible,LINK01:options.tracking,MD01:options.markdown&&options.plainText,WS01:options.whitespace,CHAR02:options.homoglyph&&normaliseHomoglyph(findingText)!==findingText,PUNC01:options.typography}[ruleId]||false);
 const processed=analyze(original).findings.filter(f=>f.cleanable&&selected(f.ruleId,f.text)).length;
 const remaining=analyze(text).findings.filter(x=>!x.cleanable).length; return {text,processed,remaining,changes};
}
