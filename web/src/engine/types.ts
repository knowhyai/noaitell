export type Language = 'en' | 'zh';
export type Category = 'format' | 'typography' | 'pattern' | 'link';
export type Confidence = 'high' | 'medium' | 'low';
export interface Segment { start:number; end:number; text:string; language:Language; excluded:boolean; kind?: 'code'|'quote'|'link'; codeStyle?: 'fenced'|'inline'; }
export interface Rule { id:string; language:Language; category:'sentence-pattern'; confidence:Confidence; autoFix:false; description:string; matcher:(sentence:string)=>Array<{start:number;end:number;label:string}>; threshold:Record<string,number>; exemptions:string[]; testCases:Array<{text:string; matches:boolean}>; enabled:boolean; }
export interface Finding { id:string; ruleId:string; category:Category; confidence:Confidence; start:number; end:number; text:string; label:string; why:string; cleanable:boolean; ignored?:boolean; }
export interface Analysis { findings:Finding[]; visibleChars:number; patternHits:number; formatHits:number; reviewCount:number; invisibleCount:number; density:number|null; }
export interface CleanOptions { invisible:boolean; markdown:boolean; typography:boolean; tracking:boolean; whitespace:boolean; homoglyph:boolean; plainText:boolean; }
export interface CleanResult {
  text: string;
  /** Number of original cleanable findings actually changed by the selected operations. */
  processed: number;
  /** All findings in the output, including unselected cleanable and review-only findings. */
  remaining: number;
  /** Applied, non-overlapping edits in original input coordinates. */
  changes: Array<{ start: number; end: number; before: string; after: string }>;
}
