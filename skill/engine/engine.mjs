/* 生成文件:由 scripts/build.mjs 从 web/src/engine 同源打包,请勿手改;重新生成:cd skill && npm run build */

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
  rule("ZH04", "zh", "medium", "时代背景套壳可改为具体背景或数据。", rx(/(?<![^，,；;\s])(?:在(?:当今|如今|当下)[^，,。！？]{0,35}?(?:的)?(?:时代|社会|背景|环境)(?:下)?|随着[^，,。！？]{1,35}?(?:不断|日益|快速|持续)(?:发展|普及|进步))/, "时代背景套壳"), true, [{ text: "随着人工智能的不断发展，内容创作正在被重塑。", matches: true }, { text: "在当今数字化时代，内容创作正在被重塑。", matches: true }, { text: "2024年随着市场发展，销量上升。", matches: false }]),
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
  rule("ZH07", "zh", "medium", "重复段首模板：≥3 个相邻段落以「首先要/其次要/最后要」等固定框架展开，请人工确认是否为模板化展开；操作教程、步骤说明等真实逻辑顺序豁免（裸过渡词「首先/其次/最后」不在本规则内）。", rx(/^\s*(?:首先需要|其次需要|再次需要|最后需要|首先要|其次要|再次要|最后要)/, "重复段首"), false, [{ text: "首先要明确目标，再谈执行。", matches: true }, { text: "我们首先要考虑成本。", matches: false }]),
  rule("ZH08", "zh", "medium", "四字格三连。", rx(/[\u4e00-\u9fff]{4}[、，][\u4e00-\u9fff]{4}[、，][\u4e00-\u9fff]{4}/, "四字格三连"), false, [{ text: "提质增效、降本增效、协同联动", matches: true }, { text: "提质增效、协同联动", matches: false }]),
  rule("ZH09", "zh", "medium", "黑话/官样词。", rx(/(?:赋能|抓手|闭环|颗粒度|拉通|沉淀|打法|组合拳|致力于打造|深度融合)/, "黑话词"), false, [{ text: "通过数据赋能业务，形成增长闭环。", matches: true }, { text: "通过数据帮助业务。", matches: false }])
];

// ../web/src/engine/links.ts
function markdownLinks(text) {
  const links = [];
  const opening = /\[((?:\\.|[^\]\\\n])*)\]\(/g;
  let match;
  while (match = opening.exec(text)) {
    const urlStart = opening.lastIndex;
    let depth = 1, end = urlStart;
    for (; end < text.length; end++) {
      const char = text[end];
      if (char === "\n" || /\s/.test(char)) break;
      if (char === "\\") {
        end++;
        continue;
      }
      if (char === "(") depth++;
      if (char === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) continue;
    links.push({ start: match.index, end: end + 1, label: match[1], url: text.slice(urlStart, end), urlStart, urlEnd: end });
    opening.lastIndex = end + 1;
  }
  return links;
}
var isTrackingKey = (key) => /^utm_/i.test(key) || ["fbclid", "gclid"].includes(key.toLowerCase());
function trackingKeys(url) {
  try {
    if (!/^https?:\/\//i.test(url)) return [];
    return [...new URL(url).searchParams.keys()].filter(isTrackingKey);
  } catch {
    return [];
  }
}
function stripTracking(url) {
  if (!trackingKeys(url).length) return url;
  const queryStart = url.indexOf("?");
  const hashStart = url.indexOf("#", queryStart);
  const queryEnd = hashStart < 0 ? url.length : hashStart;
  const query = url.slice(queryStart + 1, queryEnd).split("&").filter((part) => {
    const key = new URLSearchParams(part).keys().next().value;
    return key === void 0 || !isTrackingKey(key);
  }).join("&");
  return url.slice(0, queryStart) + (query ? `?${query}` : "") + url.slice(queryEnd);
}
function bareUrlRanges(text) {
  const ranges = [];
  const url = /(?:https?:\/\/|www\.)[^\s<>"`]+|\b(?:[a-z\d-]+\.)+[a-z]{2,}(?:[/?#][^\s<>"`]*)?/gi;
  for (const match of text.matchAll(url)) {
    const value = match[0].replace(/[.!?。！？,;:]+$/, "");
    ranges.push({ start: match.index, end: match.index + value.length });
  }
  return ranges;
}

// ../web/src/engine/segments.ts
function detectLanguage(text) {
  const chinese = text.match(/[\u3400-\u9fff]/g)?.length || 0;
  const latin = text.match(new RegExp("\\p{Script=Latin}", "gu"))?.length || 0;
  return chinese > latin ? "zh" : "en";
}
function segment(text) {
  const parts = [];
  const links = markdownLinks(text);
  const opening = /^ {0,3}(?:`{3,}|~{3,})[^\n]*$|^ {0,3}>[^\n]*$|`+|\[/gm;
  let at = 0, match;
  const push = (start, end, excluded = false, kind, codeStyle) => {
    if (end > start) {
      const value = text.slice(start, end);
      parts.push({ start, end, text: value, language: detectLanguage(value), excluded, kind, codeStyle });
    }
  };
  while (match = opening.exec(text)) {
    const start = match.index;
    let end = opening.lastIndex, kind, codeStyle;
    const fence = /^ {0,3}(`{3,}|~{3,})/.exec(match[0]);
    if (fence) {
      const closing = new RegExp(`^ {0,3}${fence[1][0]}{${fence[1].length},}[ \\t]*\\r?$`, "gm");
      closing.lastIndex = end;
      const close = closing.exec(text);
      end = close ? close.index + close[0].length : text.length;
      kind = "code";
      codeStyle = "fenced";
    } else if (/^ {0,3}>/.test(match[0])) {
      kind = "quote";
    } else if (match[0][0] === "`") {
      const closing = /`+/g;
      closing.lastIndex = end;
      let close;
      while ((close = closing.exec(text)) && close[0].length !== match[0].length) {
      }
      if (!close || text.slice(end, close.index).includes("\n")) continue;
      end = close.index + close[0].length;
      kind = "code";
      codeStyle = "inline";
    } else {
      const link = links.find((link2) => link2.start === start);
      if (!link) continue;
      end = link.end;
      kind = "link";
    }
    push(at, start);
    push(start, end, true, kind, codeStyle);
    at = end;
    opening.lastIndex = end;
  }
  push(at, text.length);
  return parts;
}
function sentences(text, offset) {
  const result = [];
  const urls = bareUrlRanges(text);
  let start = 0;
  const push = (end) => {
    const value = text.slice(start, end);
    if (value.trim()) result.push({ text: value, start: offset + start, language: detectLanguage(value) });
    start = end;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "\n") {
      push(i + 1);
      continue;
    }
    if (!/[.!?。！？]/.test(char)) continue;
    if (char === "." && /\d/.test(text[i - 1] || "") && /\d/.test(text[i + 1] || "")) continue;
    if (urls.some((url) => i >= url.start && i < url.end)) continue;
    while (/["'”’」』）)]/.test(text[i + 1] || "\0")) i++;
    push(i + 1);
  }
  push(text.length);
  return result;
}

// ../web/src/engine/characters.ts
var invisible = /[\u200B\u2060\u00AD\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u200C\u200D\u00A0\u202F\u2000-\u200A\u3000]/g;
function meaningfulJoiner(text, index) {
  const before = [...text.slice(0, index)];
  const after = [...text.slice(index + 1)];
  const modifier = /[\p{M}\p{Emoji_Modifier}]/u;
  while (before.length && modifier.test(before.at(-1))) before.pop();
  while (after.length && modifier.test(after[0])) after.shift();
  const neighbor = /[\p{L}\p{Extended_Pictographic}\p{S}]/u;
  return neighbor.test(before.at(-1) || "") && neighbor.test(after[0] || "");
}
function emojiSafeInvisible(text) {
  return text.replace(invisible, (char, index) => {
    if ((char === "‌" || char === "‍") && meaningfulJoiner(text, index)) return char;
    return /^[\u00A0\u202F\u2000-\u200A\u3000]$/.test(char) ? " " : "";
  });
}
function mixedWord(word) {
  return [new RegExp("\\p{Script=Latin}", "u"), new RegExp("\\p{Script=Cyrillic}", "u"), new RegExp("\\p{Script=Greek}", "u")].filter((script) => script.test(word)).length > 1;
}
var homoglyphs = {
  А: "A",
  В: "B",
  Е: "E",
  І: "I",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  Х: "X",
  а: "a",
  Ь: "b",
  с: "c",
  һ: "h",
  е: "e",
  і: "i",
  ј: "j",
  о: "o",
  р: "p",
  ѕ: "s",
  х: "x",
  у: "y"
};
function normaliseHomoglyph(word) {
  return mixedWord(word) ? [...word].map((char) => homoglyphs[char] || char).join("") : word;
}
var normalizePunctuation = (text) => text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...").replace(/[—–]/g, "-");
var mathematical = (text) => !new RegExp("\\p{L}", "u").test(text) && /[\p{N}\p{Sm}]/u.test(text);

// ../web/src/engine/frames.ts
var ZH07_MIN_ADJACENT = 3;
var ZH07_FRAME = /(?:首先需要|其次需要|再次需要|最后需要|首先要|其次要|再次要|最后要)/;
var TUTORIAL_CUE = /(?:打开|点击|双击|长按|滑动|拖动|勾选|输入|粘贴|下载|上传|安装|卸载|登录|登出|重启|刷新|保存|填写|弹窗|按钮|菜单|页面|输入框|快捷键|网址)/;
var STEP_CUE = /第[一二三四五六七八九十\d]+步|步骤[一二三四五六七八九十\d]/;
function repeatedOpeningHits(body, original) {
  const out = [];
  let run = [];
  const flush = () => {
    const stepWise = run.some((p) => STEP_CUE.test(p.paragraph));
    const tutorial = run.every((p) => TUTORIAL_CUE.test(p.firstSentence));
    if (run.length >= ZH07_MIN_ADJACENT && !stepWise && !tutorial) out.push(...run.map(({ start, end }) => ({ start, end, label: "重复段首模板" })));
    run = [];
  };
  for (const match of body.matchAll(/[^\n]+(?:\n(?![ \t]*\n)[^\n]+)*/g)) {
    const para = match[0];
    const lead = /^[ \t]*/.exec(para)[0].length;
    const frame = ZH07_FRAME.exec(para.slice(lead));
    if (!frame) {
      flush();
      continue;
    }
    const start = match.index + lead + frame.index;
    const lineStart = original.lastIndexOf("\n", start - 1) + 1;
    if (!/^[ \t]*$/.test(original.slice(lineStart, start))) {
      flush();
      continue;
    }
    run.push({ start, end: start + frame[0].length, firstSentence: para.slice(lead).split(/[。！？\n]/)[0], paragraph: para });
  }
  flush();
  return out;
}
var ZH_RANK = /* @__PURE__ */ new Map([["首先", 1], ["其次", 2], ["再次", 3], ["然后", 3]]);
var ZH_NUMERAL = new Map([...Array.from("一二三四五六七八九十")].map((c, i) => [c, i + 1]));
var ZH_MARKER = /首先|其次|然后|最后(?![一次天月年日名轮批款项条页个])|(?<![^\n。！？；，、：\s])(?:再次|第[一二三四五六七八九十](?![一次天月年日名轮批款项条页章步]))/g;
var ZH_ORDINAL = /^第[一二三四五六七八九十]$/;
var EN_RANK = /* @__PURE__ */ new Map([["first", 1], ["firstly", 1], ["second", 2], ["secondly", 2], ["third", 3], ["thirdly", 3], ["fourth", 4], ["fourthly", 4], ["fifth", 5], ["fifthly", 5], ["finally", 99], ["lastly", 99]]);
var EN_MARKER = /\b(?:firstly|first|secondly|second|thirdly|third|fourthly|fourth|fifthly|fifth|lastly|finally)\b/gi;
var EN_ORDINAL = /(?:first|firstly|second|secondly|third|thirdly|fourth|fourthly|fifth|fifthly)/i;
var TERMINAL_RANK = 99;
function scaffoldChainCount(body) {
  const chains = (ranks) => {
    let count = 0, run = 0, last = 0;
    for (const rank of ranks) {
      if (rank > last) {
        run++;
        last = rank;
        if (run === 3) {
          count++;
          run = 0;
          last = 0;
        }
      } else {
        run = 1;
        last = rank;
      }
    }
    return count;
  };
  const zh = [];
  for (const match of body.matchAll(ZH_MARKER)) zh.push(ZH_ORDINAL.test(match[0]) ? ZH_NUMERAL.get(match[0][1]) : ZH_RANK.get(match[0]) ?? TERMINAL_RANK);
  const en = [];
  for (const match of body.matchAll(EN_MARKER)) {
    if (match.index && !/[\n.!?;:]\s*$/.test(body.slice(0, match.index))) continue;
    if (EN_ORDINAL.test(match[0]) && !/^\s*[,:]/.test(body.slice(match.index + match[0].length))) continue;
    en.push(EN_RANK.get(match[0].toLowerCase()) ?? TERMINAL_RANK);
  }
  return chains(zh) + chains(en);
}

// ../web/src/engine/detect.ts
var make = (ruleId, category, confidence, start, end, text, label, why, cleanable) => ({
  id: `${ruleId}:${start}:${end}`,
  ruleId,
  category,
  confidence,
  start,
  end,
  text,
  label,
  why,
  cleanable
});
function deterministic(text, excluded) {
  const out = [];
  const blocked = (start, end = start + 1, allowLink = false) => excluded.some((x) => (!allowLink || x.kind !== "link") && start < x.end && end > x.start);
  for (const match of text.matchAll(invisible)) {
    const char = match[0], start = match.index;
    if (blocked(start)) continue;
    if ((char === "‌" || char === "‍") && meaningfulJoiner(text, start)) continue;
    out.push(make("CHAR01", "typography", "high", start, start + char.length, char, "不可见或特殊空白", "不可见字符会干扰复制、搜索或排版；保留字母或图形组合所需连接符。", true));
  }
  const markdown = [
    [/^ {0,3}#{1,6}[ \t]+.+/gm, "Markdown heading"],
    [/\*\*[^*\n]+\*\*/g, "Markdown bold"],
    [/^[ \t]*(?:[-*+][ \t]+|\d+\.[ \t]+)/gm, "Markdown list"]
  ];
  for (const [re, label] of markdown) {
    for (const match of text.matchAll(re)) {
      const start = match.index, end = start + match[0].length;
      if (blocked(start)) continue;
      const lineEnd = text.indexOf("\n", end);
      if (label === "Markdown list" && mathematical(text.slice(end, lineEnd < 0 ? text.length : lineEnd))) continue;
      out.push(make("MD01", "format", "high", start, end, match[0], label, "可见 Markdown 标记可按输出模式清理。", true));
    }
  }
  for (const link of markdownLinks(text)) {
    if (blocked(link.start, link.end, true)) continue;
    const tracked = trackingKeys(link.url);
    if (tracked.length) out.push(make("LINK01", "link", "high", link.start, link.end, text.slice(link.start, link.end), "Tracking parameters", `链接含 ${tracked.join(", ")}；只会移除已知跟踪参数。`, true));
  }
  for (const match of text.matchAll(/\[\d+\]|【†[^】]+】/g)) {
    if (!blocked(match.index)) out.push(make("CITE01", "link", "medium", match.index, match.index + match[0].length, match[0], "Citation marker", "引用标记可能是合法来源，因此只提示、从不自动删除。", false));
  }
  for (const match of text.matchAll(/(?:[ \t]+$|[ \t]{2,}|\t+|\n{3,})/gm)) {
    const start = match.index, end = start + match[0].length;
    if (blocked(start, end)) continue;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    if (!match[0].includes("\n") && /^[ \t]*$/.test(text.slice(lineStart, start)) && end < text.length && text[end] !== "\n") continue;
    out.push(make("WS01", "format", "high", start, end, match[0], "Extra whitespace", "多余空白可安全合并，保留行首缩进。", true));
  }
  for (const match of text.matchAll(/[\p{L}\p{M}]{2,}/gu)) {
    const start = match.index, end = start + match[0].length;
    if (!blocked(start, end) && mixedWord(match[0])) out.push(make("CHAR02", "typography", "high", start, end, match[0], "Mixed-script homoglyph", "同一单词混入外观相似的不同文字，可能造成误读或欺骗。", true));
  }
  let body = "", at = 0;
  for (const part of excluded) {
    body += text.slice(at, part.start) + text.slice(part.start, part.end).replace(/[^\n]/g, " ");
    at = part.end;
  }
  body += text.slice(at);
  for (const sentence of sentences(body, 0)) {
    if (sentence.language !== "en") continue;
    for (const match of sentence.text.matchAll(/[—–“”‘’…]/g)) {
      const start = sentence.start + match.index;
      if (!blocked(start)) out.push(make("PUNC01", "typography", "medium", start, start + 1, match[0], "Typography character", "英文发布时可按需统一为直引号、连字符或三个点。", true));
    }
  }
  return out;
}
function analyze(text, ignored = /* @__PURE__ */ new Set()) {
  const segs = segment(text);
  const excluded = segs.filter((s) => s.excluded);
  const found = deterministic(text, excluded);
  const body = segs.map((s) => s.excluded ? s.text.replace(/[^\n]/g, " ") : s.text).join("");
  let lastParagraph = 0;
  for (const paragraph of body.matchAll(/[^\n]+(?:\n(?![ \t]*\n)[^\n]+)*/g)) {
    if (paragraph[0].trim()) lastParagraph = paragraph.index;
  }
  const zh07 = rules.find((r) => r.id === "ZH07");
  for (const part of segs.filter((s) => !s.excluded)) {
    for (const sentence of sentences(part.text, part.start)) {
      for (const rule2 of rules.filter((r) => r.enabled && r.language === sentence.language && r.id !== "ZH07")) {
        for (const hit of rule2.matcher(sentence.text)) {
          const start = sentence.start + hit.start, end = sentence.start + hit.end;
          if (rule2.id === "ZH06" && start < lastParagraph) continue;
          found.push(make(rule2.id, "pattern", rule2.confidence, start, end, text.slice(start, end), hit.label, `${start + 1} → ${hit.label}：${rule2.description}`, false));
        }
      }
    }
  }
  if (zh07?.enabled) for (const hit of repeatedOpeningHits(body, text)) {
    found.push(make("ZH07", "pattern", zh07.confidence, hit.start, hit.end, text.slice(hit.start, hit.end), hit.label, `${hit.start + 1} → ${hit.label}：${zh07.description}`, false));
  }
  const unique = [...new Map(found.map((f) => [`${f.start}:${f.end}:${f.ruleId}`, f])).values()].map((f) => ({ ...f, ignored: ignored.has(f.id) }));
  const active = unique.filter((f) => !f.ignored);
  const visible = segs.reduce((count, s) => {
    const value = s.kind === "link" ? markdownLinks(s.text)[0].label : s.excluded ? "" : s.text;
    return count + [...value.replace(invisible, "").replace(/\s/g, "")].length;
  }, 0);
  const patternHits = active.filter((f) => f.category === "pattern").length;
  const formatHits = active.filter((f) => f.category === "format").length;
  const reviewCount = active.filter((f) => !f.cleanable).length;
  const invisibleCount = active.filter((f) => f.ruleId === "CHAR01").length;
  return { findings: unique, visibleChars: visible, patternHits, formatHits, reviewCount, invisibleCount, scaffoldChains: scaffoldChainCount(body), density: visible >= 150 ? Math.round(patternHits / visible * 1e3 * 10) / 10 : null };
}

// ../web/src/engine/clean.ts
var defaultOptions = { invisible: true, markdown: true, typography: false, tracking: true, whitespace: true, homoglyph: false, plainText: true };
function clean(original, options) {
  const edits = [];
  const findings = analyze(original).findings;
  const parts = segment(original);
  const plain = options.markdown && options.plainText;
  const add = (start, end, after, ruleIds) => {
    const before = original.slice(start, end);
    if (before !== after) edits.push({ start, end, before, after, ruleIds });
  };
  const wordChar = (char) => /[\p{L}\p{N}\p{M}_]/u.test(char);
  const removeDelimiter = (start, end) => {
    const before = [...original.slice(0, start)].at(-1) || "";
    const after = [...original.slice(end)][0] || "";
    add(start, end, wordChar(before) && wordChar(after) ? " " : "", ["MD01"]);
  };
  for (const finding of findings) {
    const { ruleId, start, end, text: text2 } = finding;
    if (ruleId === "CHAR01" && options.invisible) add(start, end, emojiSafeInvisible(text2), [ruleId]);
    if (ruleId === "PUNC01" && options.typography) add(start, end, normalizePunctuation(text2), [ruleId]);
    if (ruleId === "CHAR02" && options.homoglyph) add(start, end, normaliseHomoglyph(text2), [ruleId]);
    if (ruleId === "WS01" && options.whitespace) {
      const after = text2.includes("\n") ? "\n\n" : end === original.length || original[end] === "\n" || original[end] === "\r" ? "" : " ";
      add(start, end, after, [ruleId]);
    }
  }
  for (const part of parts) {
    if (part.kind === "link") {
      const link = markdownLinks(part.text)[0];
      if (plain) {
        const before = [...original.slice(0, part.start)].at(-1) || "";
        const after = [...original.slice(part.end)][0] || "";
        const label = (wordChar(before) && wordChar(link.label[0] || "") ? " " : "") + link.label + (wordChar(link.label.at(-1) || "") && wordChar(after) ? " " : "");
        add(part.start, part.end, label, ["MD01", "LINK01"]);
      } else if (options.tracking) {
        add(part.start + link.urlStart, part.start + link.urlEnd, stripTracking(link.url), ["LINK01"]);
      }
      continue;
    }
    if (!plain) continue;
    if (part.excluded) {
      if (part.kind === "quote") {
        const marker = /^( {0,3})>[ \t]?/.exec(part.text);
        if (!mathematical(part.text.slice(marker[0].length))) add(part.start + marker[1].length, part.start + marker[0].length, "", ["MD01"]);
      } else if (part.codeStyle === "inline") {
        const delimiter = /^`+/.exec(part.text);
        if (delimiter) {
          removeDelimiter(part.start, part.start + delimiter[0].length);
          removeDelimiter(part.end - delimiter[0].length, part.end);
        }
      }
      continue;
    }
    for (const match of part.text.matchAll(/^( {0,3})#{1,6}[ \t]+|^([ \t]*)(?:[-*+][ \t]+|\d+\.[ \t]+)/gm)) {
      const start = part.start + match.index;
      if (start > 0 && original[start - 1] !== "\n") continue;
      const end = start + match[0].length;
      const lineEnd = original.indexOf("\n", end);
      if (match[2] !== void 0 && mathematical(original.slice(end, lineEnd < 0 ? original.length : lineEnd))) continue;
      add(start + (match[1] ?? match[2]).length, end, "", ["MD01"]);
    }
    for (const match of part.text.matchAll(/\*\*([^*\n]+)\*\*/g)) {
      const start = part.start + match.index, end = start + match[0].length;
      removeDelimiter(start, start + 2);
      removeDelimiter(end - 2, end);
    }
  }
  const ordered = edits.sort((a, b) => a.start - b.start || a.end - b.end);
  let text = "", at = 0;
  const applied = [];
  for (const edit of ordered) {
    if (edit.start < at) continue;
    text += original.slice(at, edit.start) + edit.after;
    at = edit.end;
    applied.push(edit);
  }
  text += original.slice(at);
  const processed = findings.filter((f) => f.cleanable && applied.some(
    (edit) => edit.ruleIds.includes(f.ruleId) && edit.start < f.end && edit.end > f.start || // A removed marker can also contain an entire whitespace finding.
    edit.after === "" && edit.start <= f.start && edit.end >= f.end
  )).length;
  const remaining = analyze(text).findings.length;
  return { text, processed, remaining, changes: applied.map(({ ruleIds: _ruleIds, ...edit }) => edit) };
}
export {
  ZH07_MIN_ADJACENT,
  analyze,
  clean,
  defaultOptions,
  detectLanguage,
  emojiSafeInvisible,
  repeatedOpeningHits,
  rules,
  scaffoldChainCount,
  segment,
  sentences
};
