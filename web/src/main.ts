import { consumeUse, deviceStore, usedToday } from './quota';
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
let original='', ignored=new Set<string>(), analysis:Analysis=analyze(''), opts:CleanOptions={...defaultOptions}, result='', preview=false, stale=false, showHighlights=true, activeTab:Tab='edit', openSections=new Set<Cat>(cats), cleanupOpen=false, navIndex:number|null=null, composing=false;
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
function findingsSection(){ const list=active(), has=!!original.trim(); if(!has)return '<p class="muted">Findings will appear here.</p>'; if(!list.length)return '<div class="zero">No issues found by current rules</div>'; return cats.map(group).join(''); }
function diff(){ if(!result)return '<p class="muted">Select cleanup options to preview changes.</p>'; const same=result===original; return same?'<p class="muted">These options produce no changes.</p>':`<div class="diff"><del>${esc(original)}</del><ins>${esc(result)}</ins></div>`; }
function tabBtn(id:Tab,label:string,enabled:boolean){return `<button data-tab="${id}" class="${activeTab===id?'active':''}" ${enabled?'':'disabled'}>${label}</button>`}
function render(){
 if(activeTab==='diff'&&!result)activeTab='edit';
 const has=!!original.trim(), nActive=active().length, nRender=renderable().length;
 const formattedDensity=analysis.density===null?'Short text: counts only':`${analysis.density} per 1,000 visible characters`;
 const pageNote='Remove AI tells, make text sound natural. Check formatting and writing patterns locally.';
 const ae=document.activeElement as HTMLTextAreaElement|null; let refocus=false, selStart=0, selEnd=0, scrollTop=0; if(ae&&ae.id==='editor'&&typeof ae.setSelectionRange==='function'){refocus=true;selStart=ae.selectionStart;selEnd=ae.selectionEnd;scrollTop=ae.scrollTop;}
 const nSelected=sixOptions.filter(([k])=>opts[k]).length;
 const legend=has&&nRender>0&&!stale&&showHighlights?`<div class="legend">${legendItems.map(([k,n])=>`<span class="legend-item"><i class="dot ${k}"></i>${n}</span>`).join('')}</div>`:'';
 app.innerHTML=`<header><a class="brand" href="/"><span>◇</span> NoAITell <small>AI Text Cleaner</small></a><span class="page-title">AI Text Cleaner</span><div class="local" title="Your text stays on this device">⌾ Local · No text uploads</div></header>
<main><p class="quota-note" role="status">${quotaMessage || `${3-usedToday(deviceStore())} free uses left today · 500 words per use · No login`} <a href="/pricing/">Pro plans</a></p><p class="page-note">${pageNote}</p>
${stale?`<div class="stale">${rescanTimer!==undefined?'Text changed, checking again…':'Text changed, results may be out of date'} <button id="rescan">Check again</button></div>`:''}
<div class="workspace"><section class="panes"><nav class="tabs">${tabBtn('edit','Input / Edit',true)}${tabBtn('diff','Cleanup Diff',!!result)}</nav><div class="tab-body">
<div class="tab-panel ${activeTab==='edit'?'active':''}" data-panel="edit"><div class="pane-head"><h2>Source · Check</h2><label><input id="hide" type="checkbox" ${showHighlights?'':'checked'}/> Hide highlights</label></div>${legend}<div class="editor-stack"><div id="backdrop" class="editor-backdrop" aria-hidden="true"></div><textarea id="editor" placeholder="Paste or type text to check locally…">${esc(original)}</textarea></div><div class="edit-hint"><button id="example">Try example</button><span class="char-count">Characters ${analysis.visibleChars}</span></div></div>
<div class="tab-panel ${activeTab==='diff'?'active':''}" data-panel="diff"><div class="pane-head"><h2>Result · Changes</h2><div><button data-view="result" class="${preview?'':'active'}">Result</button><button data-view="diff" class="${preview?'active':''}">Diff</button></div></div><div class="result-body ${preview?'diff-view':''}">${preview?diff():result?'<pre>'+esc(result)+'</pre>':'<p class="muted">Your result appears here. Your source stays unchanged.</p>'}</div></div>
</div></section>
<aside class="controls"><div class="drawer-head"><span>Check and clean</span><button data-drawer="close">Collapse</button></div><div class="controls-inner">
<section class="stats-block"><div class="stats"><div><strong>${has?formattedDensity:'—'}</strong><small>Pattern density</small></div><div><strong>${has?analysis.formatHits:'—'}</strong><small>Format matches</small></div><div><strong>${has?analysis.reviewCount:'—'}</strong><small>For review</small></div></div><p class="disclaimer">Counts do not represent AI generation probability. Invisible characters: ${has?analysis.invisibleCount:'—'} matches${has&&analysis.scaffoldChains>0?`<br/>Found ${analysis.scaffoldChains} ordered scaffold chain(s) (may overlap findings above); excluded from pattern density. Structural reference only, not an authorship judgment.`:''}</p></section>
<section class="findings"><div class="findings-head"><h2>Findings <small>${nActive} items</small></h2><div class="nav-btns"><button data-nav="prev" ${nActive?'':'disabled'}>Previous</button><button data-nav="next" ${nActive?'':'disabled'}>Next</button></div></div>${findingsSection()}</section>
<section class="cleanup"><button class="cleanup-head" data-cleanup="toggle" aria-expanded="${cleanupOpen}"><span>Cleanup options · Selected ${nSelected}/6 · Output: ${opts.plainText?'Plain text':'Keep Markdown'} · Preview changes, keep source</span><span class="cleanup-toggle">${cleanupOpen?'Collapse':'Expand'}</span></button>${cleanupOpen?`<div class="cleanup-body"><p class="cleanup-note">You control the changes; ignored findings stay untouched.</p><div class="opt-grid">${sixOptions.map(([k,n])=>`<label><input type="checkbox" data-option="${k}" ${opts[k]?'checked':''}/> ${n}</label>`).join('')}</div><div class="mode"><button data-mode="plain" class="${opts.plainText?'active':''}">Plain text</button><button data-mode="markdown" class="${!opts.plainText?'active':''}">Keep Markdown</button></div></div>`:''}<button id="clean" class="primary" ${has?'':'disabled'}>Clean selected</button><div class="secondary"><button id="high" class="quiet" ${has?'':'disabled'}>Clean high-confidence only</button>${result?`<button id="copy" class="quiet">Copy result</button><button id="restore" class="quiet">Restore source</button>`:''}</div><p class="clean-stats">${lastClean?`Cleaned ${lastClean.processed} items · ${lastClean.remaining} findings remain (including unselected items and review suggestions)`:''}</p></section>
</div></aside></div>
<div class="drawer-scrim" data-drawer="close"></div>
<nav class="mobile-bar"><span>Matches <b>${nActive}</b></span><button data-drawer="toggle">Review and clean</button></nav></main>`;
renderBackdrop(); bind();
if(refocus){const ed=document.querySelector<HTMLTextAreaElement>('#editor'); ed?.focus(); ed?.setSelectionRange(selStart,selEnd); if(ed)ed.scrollTop=scrollTop; syncScroll();}
}
function scan(){ if(rescanTimer!==undefined){clearTimeout(rescanTimer);rescanTimer=undefined;} navIndex=null; analysis=analyze(original,ignored);stale=false;render(); }
function scheduleRescan(){ if(rescanTimer!==undefined)clearTimeout(rescanTimer); rescanTimer=setTimeout(()=>{rescanTimer=undefined;scan();},RESCAN_DELAY); }
let quotaMessage='';
function doClean(high=false){const quota=consumeUse(original,deviceStore());quotaMessage=quota.message;if(!quota.ok){render();return;}const copy={...opts};if(high){copy.typography=false;copy.homoglyph=true;}lastClean=clean(original,copy,new Set(analysis.findings.filter(f=>f.ignored).map(f=>f.id)));result=lastClean.text;preview=true;activeTab='diff';render();}
function showTab(tab:Tab){ if(tab==='diff'&&!result)return; activeTab=tab; document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',(b as HTMLElement).dataset.tab===tab)); document.querySelectorAll('[data-panel]').forEach(p=>p.classList.toggle('active',(p as HTMLElement).dataset.panel===tab)); }
function locateFinding(f:Finding){ document.body.classList.remove('drawer-open'); showTab('edit'); const ed=document.querySelector<HTMLTextAreaElement>('#editor'); ed?.focus(); ed?.setSelectionRange(f.start,f.end); syncScroll(); }
function navFinding(dir:'prev'|'next'){ const list=sortedActive(); if(!list.length)return; if(navIndex===null||navIndex>=list.length)navIndex=dir==='next'?0:list.length-1; else navIndex=(navIndex+(dir==='next'?1:-1)+list.length)%list.length; locateFinding(list[navIndex]!); }
function setHot(id:string|null){ document.querySelectorAll('mark[data-finding]').forEach(m=>m.classList.toggle('hl-hot',(m as HTMLElement).dataset.finding===id)); document.querySelectorAll('.finding[data-find]').forEach(r=>r.classList.toggle('hl-hot',(r as HTMLElement).dataset.find===id)); document.querySelector('.workspace')?.classList.toggle('hl-dim',!!id); }
function toggleDrawer(action:string){ if(action==='close')document.body.classList.remove('drawer-open'); else document.body.classList.toggle('drawer-open'); }
function onClickDelegated(e:Event){ const el=(e.target as HTMLElement).closest<HTMLElement>('[data-tab],[data-acc],[data-ignore],[data-locate],[data-nav],[data-cleanup],[data-mode],[data-view],[data-drawer]'); if(!el)return;
 if(el.dataset.tab)showTab(el.dataset.tab as Tab);
 else if(el.dataset.acc){const k=el.dataset.acc as Cat, open=!openSections.has(k); open?openSections.add(k):openSections.delete(k); el.closest('.group')?.classList.toggle('open',open); el.setAttribute('aria-expanded',String(open));}
 else if(el.dataset.ignore){ignored.add(el.dataset.ignore);scan();}
 else if(el.dataset.locate){const f=analysis.findings.find(x=>x.id===el.dataset.locate); if(f){navIndex=sortedActive().findIndex(x=>x.id===f.id); locateFinding(f);}}
 else if(el.dataset.nav)navFinding(el.dataset.nav as 'prev'|'next');
 else if(el.dataset.cleanup){cleanupOpen=!cleanupOpen;render();}
 else if(el.dataset.mode){opts.plainText=el.dataset.mode==='plain';render();}
 else if(el.dataset.view){preview=el.dataset.view==='diff';render();}
 else if(el.dataset.drawer)toggleDrawer(el.dataset.drawer);
}
function onHover(e:MouseEvent){ const t=e.target as HTMLElement; const m=t.closest<HTMLElement>('mark[data-finding]'); const row=t.closest<HTMLElement>('.finding[data-find]'); setHot(m?.dataset.finding||row?.dataset.find||null); }
function onHoverOut(e:MouseEvent){ const rel=e.relatedTarget as HTMLElement|null; if(rel&&typeof rel.closest==='function'&&(rel.closest('mark[data-finding]')||rel.closest('.finding[data-find]')))return; setHot(null); }
function onEditorInput(){ const editor=document.querySelector<HTMLTextAreaElement>('#editor'); if(!editor)return; original=editor.value; if(composing)return; if(result){stale=true;render();return;} if(analysis.findings.length){stale=true;scheduleRescan();render();} else scan(); }
// Backdrop marks receive no mouse events under the textarea, so the caret position
// drives the editor↔detail linkage: click/select locate the active finding at selectionStart.
function onCursor(){ const ed=document.querySelector<HTMLTextAreaElement>('#editor'); if(!ed||typeof ed.selectionStart!=='number')return; const hit=sortedActive().find(f=>f.start<=ed.selectionStart&&ed.selectionStart<f.end); if(!hit){setHot(null);return;} setHot(hit.id); navIndex=sortedActive().findIndex(x=>x.id===hit.id); document.querySelector(`.finding[data-find="${hit.id}"]`)?.scrollIntoView({block:'nearest'}); }
function bind(){const editor=document.querySelector<HTMLTextAreaElement>('#editor'); editor?.addEventListener('input',onEditorInput); editor?.addEventListener('scroll',syncScroll); editor?.addEventListener('click',onCursor); editor?.addEventListener('select',onCursor); editor?.addEventListener('compositionstart',()=>{composing=true;if(rescanTimer!==undefined){clearTimeout(rescanTimer);rescanTimer=undefined;}}); editor?.addEventListener('compositionend',()=>{composing=false;onEditorInput()});
document.querySelector('#example')?.addEventListener('click',()=>{original=example;ignored.clear();scan()});document.querySelector('#rescan')?.addEventListener('click',()=>scan());document.querySelector('#hide')?.addEventListener('change',e=>{showHighlights=!(e.target as HTMLInputElement).checked;render()});
document.querySelectorAll<HTMLInputElement>('[data-option]').forEach(i=>i.onchange=()=>{opts[i.dataset.option as keyof CleanOptions]=i.checked;render()});document.querySelector('#clean')?.addEventListener('click',()=>doClean());document.querySelector('#high')?.addEventListener('click',()=>doClean(true));document.querySelector('#copy')?.addEventListener('click',()=>navigator.clipboard?.writeText(result));document.querySelector('#restore')?.addEventListener('click',()=>{result='';lastClean=null;preview=false;activeTab='edit';render()});
app.onclick=onClickDelegated; app.onmouseover=onHover; app.onmouseout=onHoverOut;
if(typeof window!=='undefined')window.onresize=syncScroll;}
render();
