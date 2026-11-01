import type { Language, Segment } from './types';
export const detectLanguage=(s:string):Language => /[\u3400-\u9fff]/.test(s) ? 'zh' : 'en';
export function segment(text:string):Segment[] {
  const parts:Segment[]=[]; const re=/```[\s\S]*?```|`[^`\n]+`|^>.*$|\[[^\]]*\]\([^)]*\)/gm; let at=0; let m:RegExpExecArray|null;
  const push=(start:number,end:number,excluded=false,kind?:Segment['kind'])=> { if(end>start) { const value=text.slice(start,end); parts.push({start,end,text:value,language:detectLanguage(value),excluded,kind}); }};
  while((m=re.exec(text))){ push(at,m.index); const kind=m[0].startsWith('>')?'quote':m[0].startsWith('[')?'link':'code'; push(m.index,m.index+m[0].length,true,kind); at=m.index+m[0].length; }
  push(at,text.length); return parts;
}
export function sentences(segmentText:string, offset:number):Array<{text:string;start:number;language:Language}> { const result:Array<{text:string;start:number;language:Language}>=[]; const re=/[^.!?。！？\n]+[.!?。！？]?/g; let m:RegExpExecArray|null; while((m=re.exec(segmentText))) if(m[0].trim()) result.push({text:m[0],start:offset+m.index,language:detectLanguage(m[0])}); return result; }
