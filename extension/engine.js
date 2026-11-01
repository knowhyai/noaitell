/* 生成文件:由 scripts/build.mjs 从 web/src/engine 打包,请勿手改;重新生成:cd extension && npm run build */

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
  const result = [];
  const re = /[^.!?。！？\n]+[.!?。！？]?/g;
  let m;
  while (m = re.exec(segmentText)) if (m[0].trim()) result.push({ text: m[0], start: offset + m.index, language: detectLanguage(m[0]) });
  return result;
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
function analyze(text, ignored = /* @__PURE__ */ new Set()) {
  const segs = segment(text);
  const excluded = segs.filter((x) => x.excluded).map((x) => ({ start: x.start, end: x.end }));
  const found = deterministic(text, excluded);
  for (const s of segs.filter((x) => !x.excluded)) for (const sentence of sentences(s.text, s.start)) for (const r of rules.filter((r2) => r2.enabled && r2.language === sentence.language)) for (const hit of r.matcher(sentence.text)) {
    const start = sentence.start + hit.start, end = sentence.start + hit.end;
    if (!/^\s*(?:综上所述|总而言之|总的来看|不难发现)/.test(sentence.text) || r.id !== "ZH06" || s.end === text.length) found.push(make(r.id, "pattern", r.confidence, start, end, text.slice(start, end), hit.label, `${start + 1} → ${hit.label}：${r.description}`, false));
  }
  const unique = [...new Map(found.map((x) => [`${x.start}:${x.end}:${x.ruleId}`, x])).values()].map((x) => ({ ...x, ignored: ignored.has(x.id) }));
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
function clean(original, options) {
  let text = original;
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
  const selected = (ruleId, findingText) => ({ CHAR01: options.invisible, LINK01: options.tracking, MD01: options.markdown && options.plainText, WS01: options.whitespace, CHAR02: options.homoglyph && normaliseHomoglyph(findingText) !== findingText, PUNC01: options.typography })[ruleId] || false;
  const processed = analyze(original).findings.filter((f) => f.cleanable && selected(f.ruleId, f.text)).length;
  const remaining = analyze(text).findings.filter((x) => !x.cleanable).length;
  return { text, processed, remaining, changes };
}
export {
  analyze,
  clean,
  defaultOptions,
  detectLanguage,
  emojiSafeInvisible,
  rules,
  segment,
  sentences
};
