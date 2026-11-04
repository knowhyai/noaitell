import './style.css';
import { analyze, clean, defaultOptions, type Analysis, type CleanOptions, type CleanResult, type Finding } from './engine';
const example=`# A quick update\n\nIn today's fast-paced digital world, it's important to note that this is not just software, but a new way of thinking. Let's dive into the details.\n\n值得注意的是，这不仅提高了效率，更改变了团队协作的方式。随着人工智能的不断发展，内容创作正在被重塑。\n\nVisit [our guide](https://example.com/guide?utm_source=chatgpt.com&id=42) for more.\u200B\u0020\u0020\n\n【†source】`;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const categoryNames={format:'复制与格式残留',pattern:'模板化表达',typography:'排版与字符',link:'链接隐私'} as const;
type Tab='edit'|'diff';
type Cat=keyof typeof categoryNames;
const cats=Object.keys(categoryNames) as Cat[];
const sixOptions=[['invisible','去隐形字符'],['markdown','清理 Markdown 残留'],['typography','统一英文标点'],['tracking','去链接跟踪参数'],['whitespace','合并多余空白'],['homoglyph','修正同形字']] as Array<[keyof CleanOptions,string]>;
const legendItems=[['format','复制与格式残留'],['typography','排版与字符'],['pattern','模板化表达'],['link','链接隐私']] as Array<[Cat,string]>;
let original='', ignored=new Set<string>(), analysis:Analysis=analyze(''), opts:CleanOptions={...defaultOptions}, result='', preview=false, stale=false, showHighlights=true, activeTab:Tab='edit', openSections=new Set<Cat>(cats), cleanupOpen=false, navIndex:number|null=null, composing=false;
let lastClean:CleanResult|null=null, rescanTimer:ReturnType<typeof setTimeout>|undefined;
const RESCAN_DELAY=700;
const seoCopy:Record<string,string>={
 '/ai-text-cleaner/':'AI Text Cleaner：在浏览器本地清理可控的格式残留，同时保留你的原意。',
 '/ai-tell-checker/':'AI Tell Checker：逐项查看写作中的可见模式，而非猜测作者是谁。',
 '/remove-em-dashes/':'Remove Em Dashes：先查看英文排版问题，再决定是否替换。',
 '/chatgpt-watermark/':'ChatGPT watermark residue：检查复制时留下的字符、格式和链接跟踪。',
 '/claude-watermark/':'Claude watermark residue：在本地检查文本中的格式与结构化表达。',
 '/gemini-watermark/':'Gemini watermark residue：无需上传文字，即可检查常见的可清理残留。',
};
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
function findingRow(f:Finding){return `<article class="finding ${f.category}" data-find="${f.id}"><div class="finding-head"><span class="pill">${f.cleanable?'可清理':'需复核'}</span><strong>${esc(f.label)}</strong> <code>${esc(f.text)}</code></div><p>${esc(f.why)}</p><div class="finding-actions"><button data-ignore="${f.id}">${f.ignored?'已忽略':'忽略此项'}</button><button data-locate="${f.id}">定位</button></div></article>`}
function group(k:Cat){ const list=active().filter(f=>f.category===k), open=openSections.has(k); return `<section class="group ${open?'open':''}" data-group="${k}"><button class="group-head" data-acc="${k}" aria-expanded="${open}"><span class="count ${k}">${list.length}</span><span class="gname">${categoryNames[k]}</span><span class="chev">▾</span></button><div class="group-body">${list.length?list.map(findingRow).join(''):'<p class="muted group-empty">该分类暂无命中</p>'}</div></section>`; }
function findingsSection(){ const list=active(), has=!!original.trim(); if(!has)return '<p class="muted">扫描结果会逐项显示在这里。</p>'; if(!list.length)return '<div class="zero">未发现当前规则覆盖的问题</div>'; return cats.map(group).join(''); }
function diff(){ if(!result)return '<p class="muted">选择清理项后，先在这里查看改动。</p>'; const same=result===original; return same?'<p class="muted">当前选项没有产生可应用的改动。</p>':`<div class="diff"><del>${esc(original)}</del><ins>${esc(result)}</ins></div>`; }
function tabBtn(id:Tab,label:string,enabled:boolean){return `<button data-tab="${id}" class="${activeTab===id?'active':''}" ${enabled?'':'disabled'}>${label}</button>`}
function render(){
 if(activeTab==='diff'&&!result)activeTab='edit';
 const has=!!original.trim(), nActive=active().length, nRender=renderable().length;
 const formattedDensity=analysis.density===null?'短文本仅显示次数':`${analysis.density} 处 / 千可见字符`;
 const pageNote=seoCopy[location.pathname]||'';
 const ae=document.activeElement as HTMLTextAreaElement|null; let refocus=false, selStart=0, selEnd=0, scrollTop=0; if(ae&&ae.id==='editor'&&typeof ae.setSelectionRange==='function'){refocus=true;selStart=ae.selectionStart;selEnd=ae.selectionEnd;scrollTop=ae.scrollTop;}
 const nSelected=sixOptions.filter(([k])=>opts[k]).length;
 const legend=has&&nRender>0&&!stale&&showHighlights?`<div class="legend">${legendItems.map(([k,n])=>`<span class="legend-item"><i class="dot ${k}"></i>${n}</span>`).join('')}</div>`:'';
 app.innerHTML=`<header><a class="brand" href="/"><span>◇</span> NoAITell <small>AI Text Cleaner</small></a><h1 class="page-title">不判断作者，只找可清理的痕迹。</h1><div class="local" title="文本不出本机">⌾ 本地运行 · 不上传</div></header>
<main><p class="page-note">${pageNote||'在浏览器内检查格式残留、字符问题与模板化表达；你的文本不会离开设备。'}</p>
${stale?`<div class="stale">${rescanTimer!==undefined?'文本已修改，正在重新检测…':'文本已修改，结果可能过期'} <button id="rescan">重新体检</button></div>`:''}
<div class="workspace"><section class="panes"><nav class="tabs">${tabBtn('edit','输入 / 编辑',true)}${tabBtn('diff','清理 Diff',!!result)}</nav><div class="tab-body">
<div class="tab-panel ${activeTab==='edit'?'active':''}" data-panel="edit"><div class="pane-head"><h2>原文 · 检测</h2><label><input id="hide" type="checkbox" ${showHighlights?'':'checked'}/> 隐藏高亮</label></div>${legend}<div class="editor-stack"><div id="backdrop" class="editor-backdrop" aria-hidden="true"></div><textarea id="editor" placeholder="粘贴或输入文本，在本地开始检查…">${esc(original)}</textarea></div><div class="edit-hint"><button id="example">试个示例</button><span class="char-count">字数 ${analysis.visibleChars}</span></div></div>
<div class="tab-panel ${activeTab==='diff'?'active':''}" data-panel="diff"><div class="pane-head"><h2>结果 · 改动对照</h2><div><button data-view="result" class="${preview?'':'active'}">结果</button><button data-view="diff" class="${preview?'active':''}">Diff</button></div></div><div class="result-body ${preview?'diff-view':''}">${preview?diff():result?'<pre>'+esc(result)+'</pre>':'<p class="muted">清理结果会显示在这里，原文永不被覆盖。</p>'}</div></div>
</div></section>
<aside class="controls"><div class="drawer-head"><span>检查与清理</span><button data-drawer="close">收起</button></div><div class="controls-inner">
<section class="stats-block"><div class="stats"><div><strong>${has?formattedDensity:'—'}</strong><small>句式命中密度</small></div><div><strong>${has?analysis.formatHits:'—'}</strong><small>格式命中</small></div><div><strong>${has?analysis.reviewCount:'—'}</strong><small>待复核</small></div></div><p class="disclaimer">数值不代表 AI 生成概率。隐形字符：${has?analysis.invisibleCount:'—'} 处${has&&analysis.scaffoldChains>0?`<br/>检测到 ${analysis.scaffoldChains} 处序列骨架（有序表达结构，可能与上方命中重叠），不计入句式命中密度，仅供结构参考，不构成任何判断`:''}</p></section>
<section class="findings"><div class="findings-head"><h2>检测详情 <small>${nActive} 项</small></h2><div class="nav-btns"><button data-nav="prev" ${nActive?'':'disabled'}>上一处</button><button data-nav="next" ${nActive?'':'disabled'}>下一处</button></div></div>${findingsSection()}</section>
<section class="cleanup"><button class="cleanup-head" data-cleanup="toggle" aria-expanded="${cleanupOpen}"><span>清理选项 · 已选 ${nSelected}/6 · 输出：${opts.plainText?'纯文本发布':'保留 Markdown'} · 先出对照、不改原文</span><span class="cleanup-toggle">${cleanupOpen?'收起':'展开'}</span></button>${cleanupOpen?`<div class="cleanup-body"><p class="cleanup-note">可控、可撤销；已忽略的条目不会被清理。</p><div class="opt-grid">${sixOptions.map(([k,n])=>`<label><input type="checkbox" data-option="${k}" ${opts[k]?'checked':''}/> ${n}</label>`).join('')}</div><div class="mode"><button data-mode="plain" class="${opts.plainText?'active':''}">纯文本发布</button><button data-mode="markdown" class="${!opts.plainText?'active':''}">保留 Markdown</button></div></div>`:''}<button id="clean" class="primary" ${has?'':'disabled'}>清理所选项</button><div class="secondary"><button id="high" class="quiet" ${has?'':'disabled'}>仅清理高置信项</button>${result?`<button id="copy" class="quiet">复制结果</button><button id="restore" class="quiet">恢复原文</button>`:''}</div><p class="clean-stats">${lastClean?`已实际清理 ${lastClean.processed} 项 · 结果中剩余命中 ${lastClean.remaining} 项（含未选清理项与需复核项）`:''}</p></section>
</div></aside></div>
<section class="about"><h2>AI Text Cleaner，保留原意</h2><p>NoAITell 在本地浏览器中运行，检测可见的格式、链接隐私和模板化表达。它不判断文本由谁写成，也不承诺绕过任何检测。</p><details><summary>会上传我的文字吗？</summary><p>不会。工具没有后端或文本网络请求。</p></details><details><summary>为什么有些问题只提示？</summary><p>句式和引用常常是合理表达，因此必须由你决定是否修改。</p></details><details><summary>能清理什么？</summary><p>可选择清理不可见字符、Markdown 残留、已知链接跟踪参数、空白及同形字。</p></details></section>
<div class="drawer-scrim" data-drawer="close"></div>
<nav class="mobile-bar"><span>命中 <b>${nActive}</b> 项</span><button data-drawer="toggle">查看并清理</button></nav></main>`;
renderBackdrop(); bind();
if(refocus){const ed=document.querySelector<HTMLTextAreaElement>('#editor'); ed?.focus(); ed?.setSelectionRange(selStart,selEnd); if(ed)ed.scrollTop=scrollTop; syncScroll();}
}
function scan(){ if(rescanTimer!==undefined){clearTimeout(rescanTimer);rescanTimer=undefined;} navIndex=null; analysis=analyze(original,ignored);stale=false;render(); }
function scheduleRescan(){ if(rescanTimer!==undefined)clearTimeout(rescanTimer); rescanTimer=setTimeout(()=>{rescanTimer=undefined;scan();},RESCAN_DELAY); }
function doClean(high=false){const copy={...opts};if(high){copy.typography=false;copy.homoglyph=true;}lastClean=clean(original,copy,new Set(analysis.findings.filter(f=>f.ignored).map(f=>f.id)));result=lastClean.text;preview=true;activeTab='diff';render();}
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
