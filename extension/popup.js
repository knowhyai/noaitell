"use strict";
(() => {
  // ../web/src/engine/rules.ts
  var rx = (re, label) => (s) => {
    const out = [];
    let m;
    const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
    const r = new RegExp(re.source, flags);
    while (m = r.exec(s)) out.push({ start: m.index, end: m.index + m[0].length, label });
    return out;
  };
  var rule = (id, language, confidence, description, matcher, enabled, testCases) => ({ id, language, category: "sentence-pattern", confidence, autoFix: false, description, matcher, threshold: { repeat: 2 }, exemptions: ["code blocks", "quotes", "links", "user whitelist"], testCases, enabled });
  var rules = [
    rule("EN01", "en", "high", "否定式升级：用对偶把普通陈述包装成升级结论。", rx(/\bnot just\b[\s\S]{1,80}?\bbut\s+(?:also\s+)?\w+/i, "Not just X, but Y"), true, [{ text: "It is not just software, but a new way of thinking.", matches: true }, { text: "Not just a list.", matches: false }]),
    rule("EN02", "en", "high", "纠正式对偶：值得确认是否是刻意的模板化对比。", rx(/\bit(?:'s| is) not about\b[\s\S]{1,100}?\bit(?:'s| is) about\b/i, "It's not about X, it's about Y"), true, [{ text: "It's not about speed. It's about precision.", matches: true }, { text: "It is about speed.", matches: false }]),
    rule("EN05", "en", "high", "元话语开场常见于模板化导语，请人工确认。", rx(/\b(?:let's\s+(?:dive into|explore|unpack)|delve into)\b/i, "Meta opening"), true, [{ text: "Let's dive into the key benefits.", matches: true }, { text: "We studied the key benefits.", matches: false }]),
    rule("EN08", "en", "high", "时代背景开场是常见的泛化套壳。", rx(/^\s*in\s+(?:today's\s+)?(?:(?:fast-paced|modern|digital|ever-evolving|rapidly changing)\s+){1,2}(?:world|landscape|era|age|environment)\b/i, "Era-setting opening"), true, [{ text: "In today's fast-paced digital world, efficiency is everything.", matches: true }, { text: "Efficiency matters in a digital world.", matches: false }]),
    rule("EN10", "en", "medium", "元话语填充可删减或改为具体事实。", rx(/^\s*(?:it(?:'s| is)\s+(?:important|worth|crucial|essential)\s+to\s+(?:note|remember|mention|highlight)|it should be noted that)\b/i, "Meta filler"), true, [{ text: "It's important to note that results may vary.", matches: true }, { text: "Results vary.", matches: false }]),
    rule("ZH01", "zh", "medium", "“不仅—更是”双标记是常见的升级对偶。", rx(/(?:不仅|不但)[^。！？]{1,40}?(?:更|更是|而且|还)/, "不仅—更是"), true, [{ text: "这不仅提高了效率，更改变了团队协作的方式。", matches: true }, { text: "不仅提高了效率。", matches: false }]),
    rule("ZH02", "zh", "medium", "“不是—而是”结构值得确认是否需要保留。", rx(/不是[^。！？]{1,50}?而是/, "不是—而是"), true, [{ text: "真正重要的不是效率，而是价值。", matches: true }, { text: "这不是效率问题。", matches: false }]),
    rule("ZH04", "zh", "medium", "时代背景套壳可改为具体背景或数据。", rx(/^\s*(?:在(?:当今|如今|当下)[^。！？]{0,35}?(?:的)?(?:时代|社会|背景|环境)(?:下)?|随着[^。！？]{1,35}?(?:不断|日益|快速|持续)(?:发展|普及|进步))/, "时代背景套壳"), true, [{ text: "随着人工智能的不断发展，内容创作正在被重塑。", matches: true }, { text: "在当今数字化时代，内容创作正在被重塑。", matches: true }, { text: "2024年随着市场发展，销量上升。", matches: false }]),
    rule("ZH05", "zh", "medium", "空泛强调开场应由具体证据支撑。", rx(/(?:值得注意的是|需要指出的是|值得一提的是|不容忽视的是|不可否认|毋庸置疑)[，,]?/, "空泛强调"), true, [{ text: "值得注意的是，这一趋势具有深远意义。", matches: true }, { text: "数据显示，值得注意的是趋势上升。", matches: true }, { text: "数据显示，趋势上升。", matches: false }]),
    rule("ZH06", "zh", "medium", "机械收束语仅在末段值得人工复核。", rx(/^\s*(?:综上所述|总而言之|总的来看|不难发现)(?:[，,]|\s|$)/, "机械收束"), true, [{ text: "综上所述，我们应积极拥抱变化。", matches: true }, { text: "总而言之的定义很有趣。", matches: false }]),
    // Experimental data stays shipped but disabled.
    rule("EN03", "en", "medium", "From X to Y expansion.", rx(/\bfrom\s+[A-Za-z]+\s+to\s+[A-Za-z]+/i, "From X to Y"), false, [{ text: "From innovation to transformation.", matches: true }, { text: "From 1 to 2.", matches: false }]),
    rule("EN04", "en", "medium", "Three-part repetition.", rx(/\b(?:\w+\s+){1,3}\w+\.\s+(?:\w+\s+){1,3}\w+\.\s+(?:\w+\s+){1,3}\w+\./i, "Three-part repetition"), false, [{ text: "It empowers teams. It accelerates growth. It unlocks potential.", matches: true }, { text: "One sentence.", matches: false }]),
    rule("EN06", "en", "low", "Mechanical conclusion.", rx(/^\s*(?:in conclusion|to sum up)\b/i, "Mechanical conclusion"), false, [{ text: "In conclusion, technology helps.", matches: true }, { text: "Technology helps.", matches: false }]),
    rule("EN07", "en", "medium", "Repeated paragraph opening.", rx(/^the key is/mi, "Repeated opening"), false, [{ text: "The key is focus.", matches: true }, { text: "Focus matters.", matches: false }]),
    rule("EN09", "en", "medium", "Abstract noun trio.", rx(/\b(?:flexibility|scalability|reliability),\s+\w+,?\s+(?:and\s+)?\w+/i, "Abstract trio"), false, [{ text: "This offers flexibility, scalability, and reliability.", matches: true }, { text: "It offers apples, pears, and plums.", matches: false }]),
    rule("EN11", "en", "medium", "Crucial role.", rx(/\bplays? a (?:crucial|vital|pivotal|key|significant|critical) role\b/i, "Crucial role"), false, [{ text: "Sleep plays a crucial role in recovery.", matches: true }, { text: "Sleep helps recovery.", matches: false }]),
    rule("EN12", "en", "high", "Testament phrase.", rx(/\ba testament to\b/i, "A testament to"), false, [{ text: "It is a testament to support.", matches: true }, { text: "It proves support.", matches: false }]),
    rule("EN13", "en", "medium", "Whether you are framing.", rx(/^\s*whether you(?:'re| are)\b.*\b(?:or|and)\b/i, "Whether you are"), false, [{ text: "Whether you're a student or professional, it helps.", matches: true }, { text: "Students can use it.", matches: false }]),
    rule("ZH03", "zh", "medium", "排比递进。", rx(/是[^，。]{1,15}[，,]是[^，。]{1,15}[，,]更是/, "排比递进"), false, [{ text: "它是一种工具，是一种习惯，更是一种思维方式。", matches: true }, { text: "它是一种工具。", matches: false }]),
    rule("ZH07", "zh", "medium", "重复段首模板。", rx(/首先要/, "重复段首"), false, [{ text: "首先要行动。", matches: true }, { text: "行动吧。", matches: false }]),
    rule("ZH08", "zh", "medium", "四字格三连。", rx(/[\u4e00-\u9fff]{4}[、，][\u4e00-\u9fff]{4}[、，][\u4e00-\u9fff]{4}/, "四字格三连"), false, [{ text: "提质增效、降本增效、协同联动", matches: true }, { text: "提质增效、协同联动", matches: false }]),
    rule("ZH09", "zh", "medium", "黑话/官样词。", rx(/(?:赋能|抓手|闭环|颗粒度|拉通|沉淀|打法|组合拳|致力于打造|深度融合)/, "黑话词"), false, [{ text: "通过数据赋能业务，形成增长闭环。", matches: true }, { text: "通过数据帮助业务。", matches: false }])
  ];

  // ../web/src/engine/segments.ts
  var detectLanguage = (s) => /[\u3400-\u9fff]/.test(s) ? "zh" : "en";
  function segment(text) {
    const parts = [];
    const re = /```[\s\S]*?```|`[^`\n]+`|^>.*$|\[[^\]]*\]\([^)]*\)/gm;
    let at = 0;
    let m;
    const push = (start, end, excluded = false, kind) => {
      if (end > start) {
        const value = text.slice(start, end);
        parts.push({ start, end, text: value, language: detectLanguage(value), excluded, kind });
      }
    };
    while (m = re.exec(text)) {
      push(at, m.index);
      const kind = m[0].startsWith(">") ? "quote" : m[0].startsWith("[") ? "link" : "code";
      push(m.index, m.index + m[0].length, true, kind);
      at = m.index + m[0].length;
    }
    push(at, text.length);
    return parts;
  }
  function sentences(segmentText, offset) {
    const result2 = [];
    const re = /[^.!?。！？\n]+[.!?。！？]?/g;
    let m;
    while (m = re.exec(segmentText)) if (m[0].trim()) result2.push({ text: m[0], start: offset + m.index, language: detectLanguage(m[0]) });
    return result2;
  }

  // ../web/src/engine/detect.ts
  var make = (ruleId, category, confidence, start, end, text, label, why, cleanable) => ({ id: `${ruleId}:${start}:${end}`, ruleId, category, confidence, start, end, text, label, why, cleanable });
  var invisible = /[\u200B\u2060\u00AD\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u00A0\u202F]/g;
  var spaceLike = /[\u00A0\u202F]/g;
  var isEmojiJoiner = (text, i) => {
    const before = [...text.slice(0, i)].at(-1) || "";
    const after = [...text.slice(i + 1)][0] || "";
    return new RegExp("\\p{Extended_Pictographic}", "u").test(before) && new RegExp("\\p{Extended_Pictographic}", "u").test(after);
  };
  function deterministic(text, excluded) {
    const out = [];
    const blocked = (n) => excluded.some((x) => n >= x.start && n < x.end);
    let m;
    while (m = invisible.exec(text)) if (!blocked(m.index)) out.push(make("CHAR01", "typography", "high", m.index, m.index + m[0].length, m[0], "不可见或特殊空白", "不可见字符会干扰复制、搜索或排版；清理时会保留 emoji 组合所需连接符。", true));
    const markdown = [[/^#{1,6}\s+.+/gm, "Markdown heading"], [/\*\*[^*]+\*\*/g, "Markdown bold"], [/^\s*(?:[-*+]\s+|\d+\.\s+)/gm, "Markdown list"], [/`[^`\n]+`/g, "Inline code"], [/^>\s+.+/gm, "Quote marker"]];
    for (const [re, label] of markdown) {
      while (m = re.exec(text)) if (!blocked(m.index)) out.push(make("MD01", "format", "high", m.index, m.index + m[0].length, m[0], label, "可见 Markdown 标记可按输出模式清理。", true));
    }
    const link = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    while (m = link.exec(text)) {
      try {
        const u = new URL(m[2]);
        const tracked = [...u.searchParams.keys()].filter((k) => /^utm_/i.test(k) || ["fbclid", "gclid"].includes(k.toLowerCase()));
        if (tracked.length) out.push(make("LINK01", "link", "high", m.index, m.index + m[0].length, m[0], "Tracking parameters", `链接含 ${tracked.join(", ")}；只会移除已知跟踪参数。`, true));
      } catch {
      }
    }
    const cite = /\[\d+\]|【†[^】]+】/g;
    while (m = cite.exec(text)) if (!blocked(m.index)) out.push(make("CITE01", "link", "medium", m.index, m.index + m[0].length, m[0], "Citation marker", "引用标记可能是合法来源，因此只提示、从不自动删除。", false));
    const spaces = /(?: {2,}|\t+|[ \t]+$|\n{3,})/gm;
    while (m = spaces.exec(text)) if (!blocked(m.index)) out.push(make("WS01", "format", "high", m.index, m.index + m[0].length, m[0], "Extra whitespace", "多余空白可安全合并。", true));
    const word = /[\p{L}]{2,}/gu;
    while (m = word.exec(text)) {
      const s = m[0];
      const scripts = [new RegExp("\\p{Script=Latin}", "u").test(s), new RegExp("\\p{Script=Cyrillic}", "u").test(s), new RegExp("\\p{Script=Greek}", "u").test(s)].filter(Boolean).length;
      if (scripts > 1) out.push(make("CHAR02", "typography", "high", m.index, m.index + s.length, s, "Mixed-script homoglyph", "同一单词混入外观相似的不同文字，可能造成误读或欺骗。", true));
    }
    const english = text.match(/[A-Za-z]/g)?.length || 0, chinese = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
    if (english > chinese) {
      const punct = /[—–“”‘’…]/g;
      while (m = punct.exec(text)) if (!blocked(m.index)) out.push(make("PUNC01", "typography", "medium", m.index, m.index + 1, m[0], "Typography character", "英文发布时可按需统一为直引号、连字符或三个点。", true));
    }
    return out;
  }
  function analyze(text, ignored2 = /* @__PURE__ */ new Set()) {
    const segs = segment(text);
    const excluded = segs.filter((x) => x.excluded).map((x) => ({ start: x.start, end: x.end }));
    const found = deterministic(text, excluded);
    for (const s of segs.filter((x) => !x.excluded)) for (const sentence of sentences(s.text, s.start)) for (const r of rules.filter((r2) => r2.enabled && r2.language === sentence.language)) for (const hit of r.matcher(sentence.text)) {
      const start = sentence.start + hit.start, end = sentence.start + hit.end;
      if (!/^\s*(?:综上所述|总而言之|总的来看|不难发现)/.test(sentence.text) || r.id !== "ZH06" || s.end === text.length) found.push(make(r.id, "pattern", r.confidence, start, end, text.slice(start, end), hit.label, `${start + 1} → ${hit.label}：${r.description}`, false));
    }
    const unique = [...new Map(found.map((x) => [`${x.start}:${x.end}:${x.ruleId}`, x])).values()].map((x) => ({ ...x, ignored: ignored2.has(x.id) }));
    const active = unique.filter((x) => !x.ignored);
    const visible = text.replace(/```[\s\S]*?```/g, "").replace(invisible, "").replace(/\s/g, "").length;
    const patternHits = active.filter((x) => x.category === "pattern").length, formatHits = active.filter((x) => x.category === "format").length, reviewCount = active.filter((x) => !x.cleanable).length, invisibleCount = active.filter((x) => x.ruleId === "CHAR01").length;
    return { findings: unique, visibleChars: visible, patternHits, formatHits, reviewCount, invisibleCount, density: visible >= 150 ? Math.round(patternHits / visible * 1e3 * 10) / 10 : null };
  }
  function emojiSafeInvisible(text) {
    return text.replace(spaceLike, " ").replace(/[\u200B\u2060\u00AD\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u200C\u200D]/g, (c, i) => (c === "‍" || c === "‌") && isEmojiJoiner(text, i) ? c : "");
  }

  // ../web/src/engine/clean.ts
  var defaultOptions = { invisible: true, markdown: true, typography: false, tracking: true, whitespace: true, homoglyph: false, plainText: true };
  var normaliseHomoglyph = (s) => s.replace(/[АВЕІКМНОРСТХаЬсһеіјорѕху]/g, (c) => ({ А: "A", В: "B", Е: "E", І: "I", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X", а: "a", Ь: "b", с: "c", һ: "h", е: "e", і: "i", ј: "j", о: "o", р: "p", ѕ: "s", х: "x", у: "y" })[c] || c);
  function clean(original2, options) {
    let text = original2;
    const changes = [];
    const change = (next) => {
      if (next !== text) {
        changes.push({ start: 0, end: text.length, before: text, after: next });
        text = next;
      }
    };
    if (options.invisible) change(emojiSafeInvisible(text));
    if (options.tracking) change(text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
      try {
        const u = new URL(url);
        [...u.searchParams.keys()].forEach((k) => {
          if (/^utm_/i.test(k) || ["fbclid", "gclid"].includes(k.toLowerCase())) u.searchParams.delete(k);
        });
        return `[${label}](${u.toString()})`;
      } catch {
        return _;
      }
    }));
    if (options.markdown && options.plainText) change(text.replace(/^#{1,6}\s+/gm, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/^>\s?/gm, "").replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/gm, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1"));
    if (options.typography) change(text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...").replace(/[—–]/g, "-"));
    if (options.whitespace) change(text.replace(/[ \t]+$/gm, "").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n"));
    if (options.homoglyph) change(normaliseHomoglyph(text));
    const selected2 = (ruleId, findingText) => ({ CHAR01: options.invisible, LINK01: options.tracking, MD01: options.markdown && options.plainText, WS01: options.whitespace, CHAR02: options.homoglyph && normaliseHomoglyph(findingText) !== findingText, PUNC01: options.typography })[ruleId] || false;
    const processed = analyze(original2).findings.filter((f) => f.cleanable && selected2(f.ruleId, f.text)).length;
    const remaining = analyze(text).findings.filter((x) => !x.cleanable).length;
    return { text, processed, remaining, changes };
  }

  // src/popup.ts
  var example = `# A quick update

In today's fast-paced digital world, it's important to note that this is not just software, but a new way of thinking. Let's dive into the details.

值得注意的是，这不仅提高了效率，更改变了团队协作的方式。随着人工智能的不断发展，内容创作正在被重塑。

Visit [our guide](https://example.com/guide?utm_source=chatgpt.com&id=42) for more.​  

【†source】`;
  var esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var categoryNames = { format: "复制与格式残留", typography: "排版与字符", pattern: "模板化表达", link: "链接隐私" };
  var original = "";
  var ignored = /* @__PURE__ */ new Set();
  var analysis = analyze("");
  var opts = { ...defaultOptions };
  var result = "";
  var preview = false;
  var selected = /* @__PURE__ */ new Set();
  var stale = false;
  var showHighlights = true;
  var app = document.querySelector("#app");
  function renderHighlighted() {
    const previewEl = document.querySelector("#sourcePreview");
    if (!previewEl) return;
    const findings = analysis.findings.filter((f) => !f.ignored && f.ruleId !== "CHAR01" && (selected.size === 0 || selected.has(f.category)));
    let pos = 0, html = "";
    for (const f of [...findings].sort((a, b) => a.start - b.start)) {
      if (f.start < pos) continue;
      html += esc(original.slice(pos, f.start)) + `<mark class="${f.category} ${f.cleanable ? "solid" : "dashed"}" data-finding="${f.id}">${esc(original.slice(f.start, f.end))}</mark>`;
      pos = f.end;
    }
    previewEl.innerHTML = html + esc(original.slice(pos));
  }
  function chips() {
    return Object.keys(categoryNames).map((k) => {
      const n = analysis.findings.filter((f) => f.category === k && !f.ignored).length;
      return `<button class="chip ${k} ${n ? "" : "empty"} ${selected.has(k) ? "selected" : ""}" data-chip="${k}" ${n ? "" : "disabled"}><i></i>${categoryNames[k]} <b>${n}</b></button>`;
    }).join("");
  }
  function findingCard(f) {
    return `<article class="finding ${f.category}" data-find="${f.id}"><div><span class="pill">${f.cleanable ? "可清理" : "需复核"}</span><strong>${esc(f.label)}</strong> <code>${esc(f.text)}</code></div><p>${esc(f.why)}</p><div class="finding-actions"><button data-ignore="${f.id}">${f.ignored ? "已忽略" : "忽略此项"}</button><button data-locate="${f.id}">定位</button></div></article>`;
  }
  function diff() {
    if (!result) return '<p class="muted">选择清理项后，先在这里查看改动。</p>';
    const same = result === original;
    return same ? '<p class="muted">当前选项没有产生可应用的改动。</p>' : `<div class="diff"><del>${esc(original)}</del><ins>${esc(result)}</ins></div>`;
  }
  function render() {
    const has = !!original.trim(), active = analysis.findings.filter((f) => !f.ignored), nohits = has && !active.length;
    const formattedDensity = analysis.density === null ? "短文本仅显示次数" : `${analysis.density} 处 / 千可见字符`;
    const hadFocus = document.activeElement?.id === "editor", caret = hadFocus ? document.activeElement.selectionStart : 0;
    app.innerHTML = `<header><span class="brand"><span>◇</span> NoAITell</span><div class="taglines"><b>Spot AI writing patterns. Keep your meaning.</b><span>检查并清理 AI 文本中的格式残留与模板化表达</span></div><div class="local" title="文本不出本机">⌾ 本地运行 · 不上传</div></header>
<section class="summary"><div><small>句式命中密度</small><strong>${has ? formattedDensity : "—"}</strong></div><div><small>格式命中</small><strong>${has ? analysis.formatHits : "—"}</strong></div><div><small>待复核</small><strong>${has ? analysis.reviewCount : "—"}</strong></div><p>数值不代表 AI 生成概率。隐形字符：${has ? analysis.invisibleCount : "—"} 处</p></section>
<nav class="chips">${chips()}</nav>${stale ? '<div class="stale">文本已修改，结果可能过期 <button id="rescan">重新体检</button></div>' : ""}
<article class="pane"><div class="pane-head"><h2>原文 · 检测</h2><button id="example">试个示例</button><label><input id="hide" type="checkbox" ${showHighlights ? "" : "checked"}/> 隐藏高亮</label></div><textarea id="editor" placeholder="粘贴或输入文本，在本地开始检查…">${esc(original)}</textarea>${showHighlights && has ? '<div class="preview-label">检测预览（不影响编辑；隐形字符只计入统计，不做内联高亮）</div><div id="sourcePreview" class="source-preview"></div>' : ""}${!has ? '<div class="empty-state">粘贴一段文字开始检查，或 <button id="example2">试个示例</button></div>' : ""}</article>
<article class="pane"><div class="pane-head"><h2>清理选项</h2><div class="view-toggle"><button data-view="result" class="${preview ? "" : "active"}">结果</button><button data-view="diff" class="${preview ? "active" : ""}">Diff</button></div></div><p class="hint">可控、可撤销；句式与引用仅提示，不会改写。</p><div class="options">${[["invisible", "去隐形字符"], ["markdown", "清理 Markdown 残留"], ["typography", "统一英文标点"], ["tracking", "去链接跟踪参数"], ["whitespace", "合并多余空白"], ["homoglyph", "修正同形字"]].map(([k, n]) => `<label><input type="checkbox" data-option="${k}" ${opts[k] ? "checked" : ""}/> ${n}</label>`).join("")}</div><div class="mode"><button data-mode="plain" class="${opts.plainText ? "active" : ""}">纯文本发布</button><button data-mode="markdown" class="${!opts.plainText ? "active" : ""}">保留 Markdown</button></div></article>
<section class="actions"><button id="clean" class="primary" ${has ? "" : "disabled"}>清理所选项</button><button id="high" ${has ? "" : "disabled"}>仅清理高置信项</button>${result ? `<button id="copy">复制结果</button><button id="restore">恢复原文</button>` : ""}<span class="count">${result ? `已处理 ${clean(original, opts).processed} 项 · 剩余待复核 ${clean(original, opts).remaining} 项` : ""}</span></section>
<article class="pane"><div class="pane-head"><h2>结果 · 改动对照</h2></div><div class="result-body ${preview ? "diff-view" : ""}">${preview ? diff() : result ? "<pre>" + esc(result) + "</pre>" : nohits ? '<div class="nohits">未发现当前规则覆盖的问题<br/><small>基于当前规则与统计特征，不构成「真人证明」。</small></div>' : '<p class="muted">清理结果会显示在这里，原文永不被覆盖。</p>'}</div></article>
<article class="pane"><div class="pane-head"><h2>检测详情 <small>${active.length} 项</small></h2></div><div class="findings">${active.length ? active.map(findingCard).join("") : '<p class="muted">扫描结果会逐项显示在这里。</p>'}</div></article>
<footer class="privacy">检测与清理全部在本机完成，文本不会离开设备；不判断文本由谁写成，不构成「真人证明」。</footer>`;
    if (hadFocus) {
      const e = document.querySelector("#editor");
      e?.focus();
      e?.setSelectionRange(caret, caret);
    }
    renderHighlighted();
    bind();
  }
  function scan() {
    analysis = analyze(original, ignored);
    stale = false;
    render();
  }
  function doClean(high = false) {
    const copy = { ...opts };
    if (high) {
      copy.typography = false;
      copy.homoglyph = true;
    }
    result = clean(original, copy).text;
    preview = true;
    render();
  }
  function bind() {
    const editor = document.querySelector("#editor");
    editor?.addEventListener("input", () => {
      original = editor.value;
      if (result || analysis.findings.length) {
        stale = true;
        render();
      } else scan();
    });
    document.querySelector("#example")?.addEventListener("click", () => {
      original = example;
      ignored.clear();
      scan();
    });
    document.querySelector("#example2")?.addEventListener("click", () => {
      original = example;
      scan();
    });
    document.querySelector("#rescan")?.addEventListener("click", scan);
    document.querySelector("#hide")?.addEventListener("change", (e) => {
      showHighlights = !e.target.checked;
      render();
    });
    document.querySelectorAll("[data-chip]").forEach((b) => b.onclick = () => {
      const c = b.dataset.chip;
      selected.has(c) ? selected.delete(c) : selected.add(c);
      render();
    });
    document.querySelectorAll("[data-option]").forEach((i) => i.onchange = () => {
      opts[i.dataset.option] = i.checked;
      render();
    });
    document.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => {
      opts.plainText = b.dataset.mode === "plain";
      render();
    });
    document.querySelector("#clean")?.addEventListener("click", () => doClean());
    document.querySelector("#high")?.addEventListener("click", () => doClean(true));
    document.querySelector("#copy")?.addEventListener("click", () => navigator.clipboard?.writeText(result));
    document.querySelector("#restore")?.addEventListener("click", () => {
      result = "";
      preview = false;
      render();
    });
    document.querySelectorAll("[data-view]").forEach((b) => b.onclick = () => {
      preview = b.dataset.view === "diff";
      render();
    });
    document.querySelectorAll("[data-ignore]").forEach((b) => b.onclick = () => {
      ignored.add(b.dataset.ignore);
      scan();
    });
    document.querySelectorAll("[data-locate]").forEach((b) => b.onclick = () => {
      const f = analysis.findings.find((x) => x.id === b.dataset.locate);
      if (f) {
        const e = document.querySelector("#editor");
        e?.focus();
        e?.setSelectionRange(f.start, f.end);
      }
    });
  }
  render();
})();
