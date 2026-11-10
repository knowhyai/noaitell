import landing from '../content/locales/en/home.json';
import { consumeUse, countWords, deviceStore, usedToday, WORD_LIMIT } from './quota';
import './style.css';
import { analyze, clean, defaultOptions, type Analysis, type CleanOptions, type CleanResult, type Finding } from './engine';
const example=`# A quick update\n\nIn today's fast-paced digital world, it's important to note that this is not just software, but a new way of thinking. Let's dive into the details.\n\n值得注意的是，这不仅提高了效率，更改变了团队协作的方式。随着人工智能的不断发展，内容创作正在被重塑。\n\nVisit [our guide](https://example.com/guide?utm_source=chatgpt.com&id=42) for more.\u200B\u0020\u0020\n\n【†source】`;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const categoryNames={format:'Copy and formatting',pattern:'Writing patterns',typography:'Typography and characters',link:'Link privacy'} as const;
type Tab='edit'|'diff';
type Cat=keyof typeof categoryNames;
const cats=Object.keys(categoryNames) as Cat[];
const sixOptions=[['invisible','Remove invisible characters'],['markdown','Clean Markdown residue'],['typography','Normalize English punctuation'],['tracking','Remove tracking parameters'],['whitespace','Normalize whitespace'],['homoglyph','Normalize mixed-script lookalikes']] as Array<[keyof CleanOptions,string]>;
const legendItems=[['format','Copy and formatting'],['typography','Typography and characters'],['pattern','Writing patterns'],['link','Link privacy']] as Array<[Cat,string]>;
let original=document.querySelector<HTMLTextAreaElement>('#static-editor')?.value || '', ignored=new Set<string>(), analysis:Analysis=analyze(''), opts:CleanOptions={...defaultOptions}, result='', preview=false, stale=false, showHighlights=true, activeTab:Tab='edit', openSections=new Set<Cat>(cats), cleanupOpen=false, navIndex:number|null=null, composing=false;
let lastClean:CleanResult|null=null, rescanTimer:ReturnType<typeof setTimeout>|undefined;
const RESCAN_DELAY=700;
const app=document.querySelector<HTMLDivElement>('#app')!;
const active=()=>analysis.findings.filter(f=>!f.ignored);
// Invisible characters are counted in statistics only and never rendered as inline marks.
const renderable=()=>analysis.findings.filter(f=>!f.ignored&&f.ruleId!=='CHAR01');
const sortedActive=()=>[...active()].sort((a,b)=>a.start-b.start);
// The backdrop mirrors the textarea with transparent text and category backgrounds only;
// marks are skipped entirely while stale so highlights can never sit at wrong offsets.
function renderBackdrop(){ const bd=document.querySelector<HTMLDivElement>('#backdrop'); if(!bd)return; let pos=0,html=''; const findings=showHighlights&&!stale?renderable():[]; for(const f of [...findings].sort((a,b)=>a.start-b.start)){ if(f.start<pos)continue; html+=esc(original.slice(pos,f.start))+`<mark class="${f.category}" data-finding="${f.id}">${esc(original.slice(f.start,f.end))}</mark>`;pos=f.end;} bd.innerHTML=html+esc(original.slice(pos))+'\n\u200b'; syncScroll(); }
function syncScroll(){ const ed=document.querySelector<HTMLTextAreaElement>('#editor'), bd=document.querySelector<HTMLElement>('#backdrop'); if(!ed||!bd)return; bd.scrollTop=ed.scrollTop; // 16px = .editor-backdrop padding; a classic scrollbar shrinks the textarea's wrap width, so the backdrop needs the same inset.
const sbw=ed.offsetWidth-ed.clientWidth; bd.style.paddingRight=(16+sbw)+'px'; }
function findingRow(f:Finding){return `<article class="finding ${f.category}" data-find="${f.id}"><div class="finding-head"><span class="pill">${f.cleanable?'Cleanable':'Review'}</span><strong>${esc(f.label)}</strong> <code>${esc(f.text)}</code></div><p>${esc(f.why)}</p><div class="finding-actions"><button data-ignore="${f.id}">${f.ignored?'Ignored':'Ignore'}</button><button data-locate="${f.id}">Locate</button></div></article>`}
function group(k:Cat){ const list=active().filter(f=>f.category===k), open=openSections.has(k); return `<section class="group ${open?'open':''}" data-group="${k}"><button class="group-head" data-acc="${k}" aria-expanded="${open}"><span class="count ${k}">${list.length}</span><span class="gname">${categoryNames[k]}</span><span class="chev">▾</span></button><div class="group-body">${list.length?list.map(findingRow).join(''):'<p class="muted group-empty">No matches in this category</p>'}</div></section>`; }
function tellCountBar(){ const counts=new Map<string,{label:string;category:string;n:number}>(); for(const f of active()){ const row=counts.get(f.label)||{label:f.label,category:f.category,n:0}; row.n+=1; counts.set(f.label,row);} if(!counts.size)return ''; return `<div class="tell-counts">${[...counts.values()].map(row=>`<button type="button" class="tell-count ${row.category}" data-jump-label="${esc(row.label)}">${esc(row.label)} <b>${row.n}</b></button>`).join('')}</div>`; }
function findingsSection(){ const list=active(), has=!!original.trim(); if(!has)return '<p class="empty-state">Paste text above, or use Try example. Findings will appear here.</p>'; if(!list.length)return '<div class="zero">No issues found by current rules</div>'; return cats.map(group).join(''); }
function diff(){ if(!result)return '<p class="muted">Select cleanup options to preview changes.</p>'; const same=result===original; return same?'<p class="muted">These options produce no changes.</p>':`<div class="diff"><del>${esc(original)}</del><ins>${esc(result)}</ins></div>`; }
function tabBtn(id:Tab,label:string,enabled:boolean){return `<button type="button" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${activeTab===id}" data-tab="${id}" class="${activeTab===id?'active':''}" ${enabled?'':'disabled'}>${label}</button>`}
function render(){
 if(activeTab==='diff'&&!result)activeTab='edit';
 const has=!!original.trim(), nActive=active().length, nRender=renderable().length;
 const formattedDensity=analysis.density===null?'Short text: counts only':`${analysis.density} per 1,000 visible characters`;
 const pageNote='Remove AI tells, make text sound natural. Check formatting and writing patterns locally.';
 const ae=document.activeElement as HTMLTextAreaElement|null; let refocus=false, selStart=0, selEnd=0, scrollTop=0; if(ae&&ae.id==='editor'&&typeof ae.setSelectionRange==='function'){refocus=true;selStart=ae.selectionStart;selEnd=ae.selectionEnd;scrollTop=ae.scrollTop;}
 const nSelected=sixOptions.filter(([k])=>opts[k]).length;
 const overLimit=has&&countWords(original)>WORD_LIMIT;
 const quotaText=quotaMessage||`${3-usedToday(deviceStore())} free uses left today · 500 words per use · No login`;
 const legend=has&&nRender>0&&!stale&&showHighlights?`<div class="legend">${legendItems.map(([k,n])=>`<span class="legend-item"><i class="dot ${k}"></i>${n}</span>`).join('')}</div>`:'';
 const copyLabel=copying?'Copying…':'Copy result';
 app.innerHTML=`<div class="tool-app"><p class="page-note">${pageNote}</p>
${stale?`<div class="stale" role="status">${rescanTimer!==undefined?'Text changed, checking again…':'Text changed, results may be out of date'} <button type="button" id="rescan">Check again</button></div>`:''}
<div class="workspace"><section class="panes"><nav class="tabs" role="tablist" aria-label="Editor">${tabBtn('edit','Input / Edit',true)}${tabBtn('diff','Cleanup Diff',!!result)}</nav><div class="tab-body">
<div class="tab-panel ${activeTab==='edit'?'active':''}" role="tabpanel" id="panel-edit" aria-labelledby="tab-edit" data-panel="edit"><div class="editor-stack"><div id="backdrop" class="editor-backdrop" aria-hidden="true"></div><textarea aria-label="Source text" id="editor" placeholder="Paste or type text to check locally…">${esc(original)}</textarea></div><div class="edit-hint"><button type="button" id="example">Try example</button><span class="char-count">Characters ${analysis.visibleChars}</span></div></div>
<div class="tab-panel ${activeTab==='diff'?'active':''}" role="tabpanel" id="panel-diff" aria-labelledby="tab-diff" data-panel="diff"><div class="pane-head"><h2>Result · Changes</h2>${result?`<button type="button" class="quiet" data-copy="1" ${copying?'disabled':''}>${copyLabel}</button>`:''}<div><button type="button" data-view="result" class="${preview?'':'active'}">Result</button><button type="button" data-view="diff" class="${preview?'active':''}">Diff</button></div></div><div class="result-body ${preview?'diff-view':''}">${preview?diff():result?'<pre>'+esc(result)+'</pre>':'<p class="muted">Your result appears here. Your source stays unchanged.</p>'}</div></div>
</div><div class="clean-action"><p class="quota-note${quotaIsError?' is-error':''}" role="${quotaIsError?'alert':'status'}">${esc(quotaText)}</p>${!quotaIsError&&overLimit?'<p class="form-error" role="alert">Free cleaning supports up to 500 words per use.</p>':''}${copyError?`<p class="form-error" role="alert">${esc(copyError)}</p>`:''}${copyNote?`<p class="form-status" role="status">${esc(copyNote)}</p>`:''}<button id="clean" class="primary" type="button" ${has&&!overLimit?'':'disabled'}>${esc(landing.toolCopy.cleanLabel)}</button><p class="trust-line">${esc(landing.toolCopy.trustLine)}</p></div></section>
<aside class="controls"><div class="drawer-head"><span>Check and clean</span><button data-drawer="close">Collapse</button></div><div class="controls-inner">
<section class="stats-block">${legend}<div class="pane-head"><h2>Source · Check</h2><label><input id="hide" type="checkbox" ${showHighlights?'':'checked'}/> Hide highlights</label></div>${has?tellCountBar():''}${has?`<div class="stats"><div><strong>${has?formattedDensity:'—'}</strong><small>Pattern density</small></div><div><strong>${has?analysis.formatHits:'—'}</strong><small>Format matches</small></div><div><strong>${has?analysis.reviewCount:'—'}</strong><small>For review</small></div></div><p class="disclaimer">Counts do not represent AI generation probability. Invisible characters: ${has?analysis.invisibleCount:'—'} matches${has&&analysis.scaffoldChains>0?`<br/>Found ${analysis.scaffoldChains} ordered scaffold chain(s) (may overlap findings above); excluded from pattern density. Structural reference only, not an authorship judgment.`:''}</p>`:'<p class="empty-state empty-stats">Paste text to see pattern density and findings. Try the example to explore a sample.</p>'}</section>
<section class="findings"><div class="findings-head"><h2>Findings <small>${nActive} items</small></h2><div class="nav-btns"><button data-nav="prev" ${nActive?'':'disabled'}>Previous</button><button data-nav="next" ${nActive?'':'disabled'}>Next</button></div></div>${findingsSection()}</section>
<section class="cleanup"><button class="cleanup-head" data-cleanup="toggle" aria-expanded="${cleanupOpen}"><span>Cleanup options · Selected ${nSelected}/6 · Output: ${opts.plainText?'Plain text':'Keep Markdown'} · Preview changes, keep source</span><span class="cleanup-toggle">${cleanupOpen?'Collapse':'Expand'}</span></button>${cleanupOpen?`<div class="cleanup-body"><p class="cleanup-note">You control the changes; ignored findings stay untouched.</p><div class="opt-grid">${sixOptions.map(([k,n])=>`<label><input type="checkbox" data-option="${k}" ${opts[k]?'checked':''}/> ${n}</label>`).join('')}</div><div class="mode"><button data-mode="plain" class="${opts.plainText?'active':''}">Plain text</button><button data-mode="markdown" class="${!opts.plainText?'active':''}">Keep Markdown</button></div></div>`:''}<div class="secondary"><button type="button" id="high" class="quiet" ${has&&!overLimit?'':'disabled'}>Clean high-confidence only</button>${result?`<button type="button" id="copy" class="quiet" data-copy="1" ${copying?'disabled':''}>${copyLabel}</button><button type="button" id="restore" class="quiet">Restore source</button>`:''}</div><p class="clean-stats">${lastClean?`Cleaned ${lastClean.processed} items · ${lastClean.remaining} findings remain (including unselected items and review suggestions)`:''}</p></section>
</div></aside></div>
<div class="drawer-scrim" data-drawer="close"></div>
<nav class="mobile-bar"><span>Matches <b>${nActive}</b></span><button type="button" data-drawer="toggle">Review findings</button></nav></div>`;
renderBackdrop(); bind();
if(refocus){const ed=document.querySelector<HTMLTextAreaElement>('#editor'); ed?.focus(); ed?.setSelectionRange(selStart,selEnd); if(ed)ed.scrollTop=scrollTop; syncScroll();}
}
function scan(){ if(rescanTimer!==undefined){clearTimeout(rescanTimer);rescanTimer=undefined;} navIndex=null; analysis=analyze(original,ignored);stale=false;render(); }
function scheduleRescan(){ if(rescanTimer!==undefined)clearTimeout(rescanTimer); rescanTimer=setTimeout(()=>{rescanTimer=undefined;scan();},RESCAN_DELAY); }
let quotaMessage='';
let quotaIsError=false;
let copying=false;
let copyNote='';
let copyError='';
function doClean(high=false){const quota=consumeUse(original,deviceStore());quotaMessage=quota.message;quotaIsError=!quota.ok;if(!quota.ok){render();return;}copyNote='';copyError='';const copy={...opts};if(high){copy.typography=false;copy.homoglyph=true;}lastClean=clean(original,copy,new Set(analysis.findings.filter(f=>f.ignored).map(f=>f.id)));result=lastClean.text;preview=true;activeTab='diff';render();}
async function copyResult(){if(copying||!result)return;copying=true;copyNote='';copyError='';render();try{if(!navigator.clipboard?.writeText)throw new Error('unavailable');await navigator.clipboard.writeText(result);copyNote='Copied.';}catch{copyError='Couldn’t copy automatically. Select the result and copy it yourself.';}finally{copying=false;render();}}
function jumpLabel(label:string){const list=sortedActive().filter(f=>f.label===label);if(!list.length)return;const current=navIndex!==null?sortedActive()[navIndex]:undefined;const next=list.find(f=>current?f.start>current.start:true)||list[0]!;navIndex=sortedActive().findIndex(x=>x.id===next.id);locateFinding(next);}
function showTab(tab:Tab){ if(tab==='diff'&&!result)return; activeTab=tab; document.querySelectorAll('[data-tab]').forEach(b=>{const on=(b as HTMLElement).dataset.tab===tab; b.classList.toggle('active',on); b.setAttribute?.('aria-selected',String(on));}); document.querySelectorAll('[data-panel]').forEach(p=>p.classList.toggle('active',(p as HTMLElement).dataset.panel===tab)); }
function locateFinding(f:Finding){ document.body.classList.remove('drawer-open'); showTab('edit'); const ed=document.querySelector<HTMLTextAreaElement>('#editor'); ed?.focus(); ed?.setSelectionRange(f.start,f.end); syncScroll(); }
function navFinding(dir:'prev'|'next'){ const list=sortedActive(); if(!list.length)return; if(navIndex===null||navIndex>=list.length)navIndex=dir==='next'?0:list.length-1; else navIndex=(navIndex+(dir==='next'?1:-1)+list.length)%list.length; locateFinding(list[navIndex]!); }
function setHot(id:string|null){ document.querySelectorAll('mark[data-finding]').forEach(m=>m.classList.toggle('hl-hot',(m as HTMLElement).dataset.finding===id)); document.querySelectorAll('.finding[data-find]').forEach(r=>r.classList.toggle('hl-hot',(r as HTMLElement).dataset.find===id)); document.querySelector('.workspace')?.classList.toggle('hl-dim',!!id); }
function toggleDrawer(action:string){ if(action==='close')document.body.classList.remove('drawer-open'); else document.body.classList.toggle('drawer-open'); }
function onClickDelegated(e:Event){ const el=(e.target as HTMLElement).closest<HTMLElement>('[data-tab],[data-acc],[data-ignore],[data-locate],[data-nav],[data-cleanup],[data-mode],[data-view],[data-drawer],[data-jump-label],[data-copy]'); if(!el)return;
 if(el.dataset.tab)showTab(el.dataset.tab as Tab);
 else if(el.dataset.acc){const k=el.dataset.acc as Cat, open=!openSections.has(k); open?openSections.add(k):openSections.delete(k); el.closest('.group')?.classList.toggle('open',open); el.setAttribute('aria-expanded',String(open));}
 else if(el.dataset.ignore){ignored.add(el.dataset.ignore);scan();}
 else if(el.dataset.locate){const f=analysis.findings.find(x=>x.id===el.dataset.locate); if(f){navIndex=sortedActive().findIndex(x=>x.id===f.id); locateFinding(f);}}
 else if(el.dataset.nav)navFinding(el.dataset.nav as 'prev'|'next');
 else if(el.dataset.cleanup){cleanupOpen=!cleanupOpen;render();}
 else if(el.dataset.mode){opts.plainText=el.dataset.mode==='plain';render();}
 else if(el.dataset.view){preview=el.dataset.view==='diff';render();}
 else if(el.dataset.drawer)toggleDrawer(el.dataset.drawer);
 else if(el.dataset.jumpLabel)jumpLabel(el.dataset.jumpLabel);
 else if('copy' in el.dataset)void copyResult();
}
function onHover(e:MouseEvent){ const t=e.target as HTMLElement; const m=t.closest<HTMLElement>('mark[data-finding]'); const row=t.closest<HTMLElement>('.finding[data-find]'); setHot(m?.dataset.finding||row?.dataset.find||null); }
function onHoverOut(e:MouseEvent){ const rel=e.relatedTarget as HTMLElement|null; if(rel&&typeof rel.closest==='function'&&(rel.closest('mark[data-finding]')||rel.closest('.finding[data-find]')))return; setHot(null); }
function onEditorInput(){ const editor=document.querySelector<HTMLTextAreaElement>('#editor'); if(!editor)return; original=editor.value; if(composing)return; if(result){stale=true;render();return;} if(analysis.findings.length){stale=true;scheduleRescan();render();} else scan(); }
// Backdrop marks receive no mouse events under the textarea, so the caret position
// drives the editor↔detail linkage: click/select locate the active finding at selectionStart.
function onCursor(){ const ed=document.querySelector<HTMLTextAreaElement>('#editor'); if(!ed||typeof ed.selectionStart!=='number')return; const hit=sortedActive().find(f=>f.start<=ed.selectionStart&&ed.selectionStart<f.end); if(!hit){setHot(null);return;} setHot(hit.id); navIndex=sortedActive().findIndex(x=>x.id===hit.id); document.querySelector(`.finding[data-find="${hit.id}"]`)?.scrollIntoView({block:'nearest'}); }
function bind(){const editor=document.querySelector<HTMLTextAreaElement>('#editor'); editor?.addEventListener('input',onEditorInput); editor?.addEventListener('scroll',syncScroll); editor?.addEventListener('click',onCursor); editor?.addEventListener('select',onCursor); editor?.addEventListener('compositionstart',()=>{composing=true;if(rescanTimer!==undefined){clearTimeout(rescanTimer);rescanTimer=undefined;}}); editor?.addEventListener('compositionend',()=>{composing=false;onEditorInput()});
document.querySelector('#example')?.addEventListener('click',()=>{original=example;ignored.clear();scan()});document.querySelector('#rescan')?.addEventListener('click',()=>scan());document.querySelector('#hide')?.addEventListener('change',e=>{showHighlights=!(e.target as HTMLInputElement).checked;render()});
document.querySelectorAll<HTMLInputElement>('[data-option]').forEach(i=>i.onchange=()=>{opts[i.dataset.option as keyof CleanOptions]=i.checked;render()});document.querySelector('#clean')?.addEventListener('click',()=>doClean());document.querySelector('#mobile-clean')?.addEventListener('click',()=>doClean());document.querySelector('#high')?.addEventListener('click',()=>doClean(true));document.querySelector('#restore')?.addEventListener('click',()=>{result='';lastClean=null;preview=false;activeTab='edit';copyNote='';copyError='';render()});
app.onclick=onClickDelegated; app.onmouseover=onHover; app.onmouseout=onHoverOut;
if(typeof window!=='undefined')window.onresize=syncScroll;}
scan();
