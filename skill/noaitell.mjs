#!/usr/bin/env node
// NoAITell Agent Skill CLI:在命令行运行与网页版相同的检测引擎(web/src/engine 同源打包)。
// 从文件或 stdin 读取文本,输出按分类的命中报告与密度指标;仅在用户明确选择时应用清理。
// 运行时零依赖,需要 Node.js >= 18。
import { analyze, clean, defaultOptions } from './engine/engine.mjs';
import { readFileSync } from 'node:fs';

const usage = `NoAITell — 检查并清理 AI 文本中的格式残留与模板化表达(本地运行,不上传文本)

用法: node noaitell.mjs [选项] [文件]
      cat 文本 | node noaitell.mjs [选项]

选项:
  --json            以 JSON 输出(供程序/Agent 解析)
  --clean           在报告中附带清理后的文本
  --no-invisible    关闭「去隐形字符」(默认开)
  --no-markdown     关闭「清理 Markdown 残留」(默认开)
  --no-tracking     关闭「去链接跟踪参数」(默认开)
  --no-whitespace   关闭「合并多余空白」(默认开)
  --typography      开启「统一英文标点」(默认关)
  --homoglyph       开启「修正同形字」(默认关)
  --keep-markdown   保留 Markdown 结构(输出模式=保留 Markdown;默认纯文本发布)
  -h, --help        显示本说明

默认清理选项与网页版完全一致(${JSON.stringify(defaultOptions)})。
句式(模板化表达)与引用标记只报告、绝不改写或删除。`;
const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) { console.log(usage); process.exit(0); }
const has = (f) => args.includes(f);
const files = args.filter(a => !a.startsWith('-'));
const unknown = args.filter(a => a.startsWith('-') && a !== '-' && !['--json', '--clean', '--no-invisible', '--no-markdown', '--no-tracking', '--no-whitespace', '--typography', '--homoglyph', '--keep-markdown'].includes(a));
if (unknown.length || files.length > 1) {
  if (unknown.length) console.error(`错误:未知参数 ${unknown.join(' ')}`);
  else console.error('错误:最多指定一个输入文件。');
  console.error(usage); process.exit(2);
}

async function readInput() {
  if (files.length) return readFileSync(files[0], 'utf8');
  if (process.stdin.isTTY) { console.error('错误:未提供输入。把文件作为参数,或通过 stdin 管道传入文本。'); console.error(usage); process.exit(2); }
  const chunks = []; for await (const c of process.stdin) chunks.push(c); return Buffer.concat(chunks).toString('utf8');
}

const text = await readInput();
const opts = {
  invisible: !has('--no-invisible'),
  markdown: !has('--no-markdown'),
  typography: has('--typography'),
  tracking: !has('--no-tracking'),
  whitespace: !has('--no-whitespace'),
  homoglyph: has('--homoglyph'),
  plainText: !has('--keep-markdown'),
};

const analysis = analyze(text);
const find = has('--clean') ? clean(text, opts) : null;
const out = {
  analysis: { visibleChars: analysis.visibleChars, patternHits: analysis.patternHits, formatHits: analysis.formatHits, reviewCount: analysis.reviewCount, invisibleCount: analysis.invisibleCount, density: analysis.density },
  findings: analysis.findings.map(({ id, ruleId, category, confidence, start, end, text, label, why, cleanable }) => ({ id, ruleId, category, confidence, start, end, text, label, why, cleanable })),
  ...(has('--clean') ? { clean: { text: find.text, processed: find.processed, remaining: find.remaining } } : {}),
};

if (has('--json')) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }

const categoryNames = { format: '复制与格式残留', typography: '排版与字符', pattern: '模板化表达', link: '链接隐私' };
const density = analysis.density === null ? '短文本仅显示次数' : `${analysis.density} 处 / 千可见字符`;
const lines = [];
lines.push(`句式命中: ${analysis.patternHits}  (密度: ${density})`);
lines.push(`格式命中: ${analysis.formatHits}   待复核: ${analysis.reviewCount}   隐形字符: ${analysis.invisibleCount} 处(仅统计)`);
lines.push(`可见字符: ${analysis.visibleChars}   数值不代表 AI 生成概率`);
lines.push('');
const active = analysis.findings.filter(f => !f.ignored);
if (!active.length) {
  lines.push('未发现当前规则覆盖的问题');
  lines.push('基于当前规则与统计特征，不构成「真人证明」。');
} else {
  for (const cat of Object.keys(categoryNames)) {
    const group = active.filter(f => f.category === cat);
    if (!group.length) continue;
    lines.push(`## ${categoryNames[cat]} (${group.length})`);
    for (const f of group) lines.push(`- [${f.ruleId}] ${f.label} · ${f.cleanable ? '可清理' : '需复核'} @${f.start}-${f.end}: ${JSON.stringify(f.text)} — ${f.why}`);
    lines.push('');
  }
}
if (has('--clean')) {
  lines.push(`--- 清理结果(已处理 ${find.processed} 项 · 剩余待复核 ${find.remaining} 项) ---`);
  lines.push(find.text);
}
console.log(lines.join('\n'));
