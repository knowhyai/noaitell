// 冒烟/一致性检查:证明 skill/engine/engine.mjs(打包后的引擎)在共享样本文本上
// 与 web/src/engine 的现场编译结果输出完全相同,并验证 CLI 的 JSON/文本输出可用。
// 用法:cd skill && npm install && npm test
// 注意:test 需要 esbuild(仅开发依赖);运行时(engine/engine.mjs 与 noaitell.mjs)零依赖。
import { build } from 'esbuild';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const skillRoot = fileURLToPath(new URL('..', import.meta.url));

// 1. 现场编译 web/src/engine 作为基准。
const tmp = '.smoke-web-engine.mjs';
await build({ entryPoints: ['../web/src/engine/index.ts'], bundle: true, format: 'esm', platform: 'neutral', target: 'node18', outfile: tmp, logLevel: 'silent' });
const web = await import(`../${tmp}`);
const bundled = await import('../engine/engine.mjs');
try {

// 2. 共享样本文本:覆盖全部启用句式规则、确定性检测、豁免与边界(与 extension/scripts/smoke.mjs 同一套)。
const samples = [
  `# A quick update\n\nIn today's fast-paced digital world, it's important to note that this is not just software, but a new way of thinking. Let's dive into the details.\n\n值得注意的是，这不仅提高了效率，更改变了团队协作的方式。随着人工智能的不断发展，内容创作正在被重塑。\n\nVisit [our guide](https://example.com/guide?utm_source=chatgpt.com&id=42) for more.\u200B\u0020\u0020\n\n【†source】`,
  'It is not just software, but a new way of thinking.',
  "It's not about speed. It's about precision.",
  "Let's delve into the key benefits.",
  "In the ever-evolving digital landscape, efficiency is everything.",
  "It should be noted that results may vary.",
  '这不仅提高了效率，更改变了团队协作的方式。',
  '真正重要的不是效率，而是价值。',
  '在当今数字化时代，内容创作正在被重塑。',
  '值得注意的是，这一趋势具有深远意义。',
  '综上所述，我们应积极拥抱变化。',
  'A\u200BB 👩‍💻',
  'pаypal',
  'Привет мир',
  '`**bold**`\n> **quote**\n[not just X, but Y](https://x.test)',
  '[x](https://a.test/p?utm_source=x&id=2)',
  'Contact [docs](https://example.com/?fbclid=abc123&utm_campaign=z) here.',
  '中文“引号”与——是正常排版。',
  'English “curly quotes”, an — em dash, – en dash and … ellipsis.',
  "这是中文说明。 Let's dive into the key benefits. 这里继续中文。",
  'hello\u00A0world\u202Fagain',
  `It is not just software, but a tool. ${'x'.repeat(200)} **bold** **again**`,
  '数据显示，值得注意的是趋势正在变化。',
  'A\u200BB\u200BC',
  '首先要把目标拆小。\n\n其次要保持每天复盘。\n\n最后要坚持长期跟踪。', // 规则加强批:ZH07 骨架(实验规则默认关闭,应零命中)+ 中文链统计
  '第一步要准备环境。\n第二步要安装依赖。\n第三步要运行测试。',       // 规则加强批:第X步计数用法不成链、教程不命中
  'First, define the goal.\nSecond, pick the metric.\nThird, review weekly.', // 规则加强批:英文链统计
  'First prize went to Alice. Second prize went to Bob. Finally, the prizes were distributed.', // 规则加强批追加:序数词修饰名词不成链
  '',
  '   \n\n  ',
  'Plain text with no tells at all, just a normal sentence.',
];

let checks = 0;
const cleanVariants = [
  undefined,
  { invisible: true, markdown: true, typography: true, tracking: true, whitespace: true, homoglyph: true, plainText: false },
  { invisible: false, markdown: false, typography: false, tracking: false, whitespace: false, homoglyph: false, plainText: true },
];
for (const [i, text] of samples.entries()) {
  const label = `sample[${i}]`;
  assert.deepEqual(web.analyze(text), bundled.analyze(text), `${label}: analyze`);
  checks++;
  const first = web.analyze(text).findings.slice(0, 2).map(f => f.id);
  assert.deepEqual(web.analyze(text, new Set(first)), bundled.analyze(text, new Set(first)), `${label}: analyze+ignored`);
  checks++;
  for (const [v, variant] of cleanVariants.entries()) {
    const opts = variant ?? web.defaultOptions;
    assert.deepEqual(web.defaultOptions, bundled.defaultOptions, 'defaultOptions 必须一致');
    assert.deepEqual(web.clean(text, opts), bundled.clean(text, opts), `${label}: clean#${v}`);
    checks++;
  }
  assert.equal(web.emojiSafeInvisible(text), bundled.emojiSafeInvisible(text), `${label}: emojiSafeInvisible`);
  checks++;
}
const zero = web.analyze(samples.at(-1));
assert.equal(zero.findings.length, 0, '零命中样本文本不应产生命中');
assert.match(readFileSync(new URL('./sample.txt', import.meta.url), 'utf8'), /【†source】/);
checks += 2;

// 规则加强批:ZH07 实验规则默认关闭(骨架文本零命中);scaffoldChains 只计数(中英链各计 1,第X步用法不计)。
const skeletonText = '首先要把目标拆小。\n\n其次要保持每天复盘。\n\n最后要坚持长期跟踪。';
assert.equal(web.analyze(skeletonText).findings.length, 0, 'ZH07 实验规则默认关闭,骨架文本不应产生命中');
assert.equal(web.analyze(skeletonText).scaffoldChains, 1, '中文序列骨架应计 1 条链');
assert.equal(web.analyze('第一步要准备环境。\n第二步要安装依赖。\n第三步要运行测试。').scaffoldChains, 0, '第X步计数用法不应成链');
assert.equal(web.analyze('First, define the goal.\nSecond, pick the metric.\nThird, review weekly.').scaffoldChains, 1, '英文序列骨架应计 1 条链');
assert.equal(web.analyze('First prize went to Alice. Second prize went to Bob. Finally, the prizes were distributed.').scaffoldChains, 0, '序数词修饰名词(first prize)不应成链');
checks += 5;

// 3. CLI 检查:JSON 输出与引擎直跑一致;文本输出含密度指标;--clean 输出清理文本;零命中文案精确。
const cli = `${skillRoot}noaitell.mjs`;
const samplePath = `${skillRoot}test/sample.txt`;
const sampleText = readFileSync(samplePath, 'utf8');

const { stdout: jsonOut } = await execFileP('node', [cli, '--json', '--clean', samplePath], { cwd: skillRoot });
const parsed = JSON.parse(jsonOut);
const direct = bundled.analyze(sampleText);
assert.deepEqual(parsed.analysis, { visibleChars: direct.visibleChars, patternHits: direct.patternHits, formatHits: direct.formatHits, reviewCount: direct.reviewCount, invisibleCount: direct.invisibleCount, density: direct.density });
assert.deepEqual(parsed.findings, direct.findings.map(({ id, ruleId, category, confidence, start, end, text, label, why, cleanable }) => ({ id, ruleId, category, confidence, start, end, text, label, why, cleanable })));
const directClean = bundled.clean(sampleText, bundled.defaultOptions);
assert.deepEqual(parsed.clean, { text: directClean.text, processed: directClean.processed, remaining: directClean.remaining });
checks += 3;

const { stdout: textOut } = await execFileP('node', [cli, '--clean', samplePath], { cwd: skillRoot });
assert.match(textOut, /句式命中: /);
assert.match(textOut, /清理结果\(已处理 \d+ 项 · 剩余待复核 \d+ 项\)/);
assert.ok(textOut.includes(directClean.text), '文本模式应包含清理后全文');
checks += 3;

const runStdin = (input, ...flags) => new Promise((resolve, reject) => {
  const p = spawn('node', [cli, ...flags], { cwd: skillRoot });
  let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  p.on('close', code => code === 0 ? resolve(out) : reject(new Error(`exit ${code}: ${out}`)));
  p.stdin.end(input);
});
const zeroStdin = await runStdin('Plain text with no tells at all, just a normal sentence.');
assert.ok(zeroStdin.includes('未发现当前规则覆盖的问题'), '零命中时文案必须精确出现');
const stdinJson = await runStdin('It is not just software, but a tool.', '--json');
assert.equal(JSON.parse(stdinJson).analysis.patternHits, 1, 'stdin 输入应正确解析');
checks += 2;

const { code } = await execFileP('node', [cli, '--bogus'], { cwd: skillRoot }).then(() => ({ code: 0 }), (e) => ({ code: e.code }));
assert.equal(code, 2, '未知参数应以退出码 2 报错');
checks++;

console.log(`✓ 一致性检查通过:${samples.length} 个共享样本 × analyze/ignored/clean×3/emojiSafeInvisible + 8 项 CLI 检查,共 ${checks} 项断言;skill 打包引擎与 web/src/engine 输出完全相同。`);
} finally {
  rmSync(tmp, { force: true });
}
