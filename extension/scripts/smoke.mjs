// 冒烟/一致性检查:证明 extension/ 打包进扩展的引擎(engine.js、popup.js 内联引擎)
// 在共享样本文本上与 web/src/engine 的实时编译结果输出完全相同的命中。
// 用法:cd extension && npm install && npm test
import { build } from 'esbuild';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import assert from 'node:assert/strict';

// 1. 用 esbuild 现场编译 web/src/engine,作为基准实现。
const tmp = '.smoke-web-engine.mjs';
await build({ entryPoints: ['../web/src/engine/index.ts'], bundle: true, format: 'esm', platform: 'neutral', target: 'node18', outfile: tmp, logLevel: 'silent' });
const web = await import(`../${tmp}`);
const ext = await import('../engine.js'); // 扩展提交在库里的打包产物
try {

// 2. 共享样本文本:覆盖全部启用句式规则、确定性检测、豁免与边界。
const samples = [
  // 网页版内置示例(main.ts 同一份),覆盖标题/EN01/EN05/EN08/EN10/ZH01/ZH04/ZH05/跟踪链接/不可见字符/引用标记/多余空格
  `# A quick update\n\nIn today's fast-paced digital world, it's important to note that this is not just software, but a new way of thinking. Let's dive into the details.\n\n值得注意的是，这不仅提高了效率，更改变了团队协作的方式。随着人工智能的不断发展，内容创作正在被重塑。\n\nVisit [our guide](https://example.com/guide?utm_source=chatgpt.com&id=42) for more.\u200B\u0020\u0020\n\n【†source】`,
  // 启用句式规则的正例
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
  // 确定性检测与豁免
  'A\u200BB 👩‍💻',                       // 不可见字符 + emoji ZWJ 保留
  'pаypal',                              // 西里尔同形字(词内混排)
  'Привет мир',                          // 整段外文不报同形字
  '`**bold**`\n> **quote**\n[not just X, but Y](https://x.test)', // 代码/引用/链接内不扫描
  '[x](https://a.test/p?utm_source=x&id=2)',                      // 跟踪参数 + 功能参数
  'Contact [docs](https://example.com/?fbclid=abc123&utm_campaign=z) here.',
  '中文“引号”与——是正常排版。',          // 中文标点豁免
  'English “curly quotes”, an — em dash, – en dash and … ellipsis.', // 英文标点命中
  "这是中文说明。 Let's dive into the key benefits. 这里继续中文。",  // 混排句子分别匹配语种
  'hello\u00A0world\u202Fagain',          // NBSP/窄 NBSP 归一
  `It is not just software, but a tool. ${'x'.repeat(200)} **bold** **again**`, // 密度口径
  '数据显示，值得注意的是趋势正在变化。',  // 句中 ZH05
  'A\u200BB\u200BC',                      // 逐处计数
  '首先要把目标拆小。\n\n其次要保持每天复盘。\n\n最后要坚持长期跟踪。', // 规则加强批:ZH07 骨架(实验规则默认关闭,应零命中)+ 中文链统计
  '第一步要准备环境。\n第二步要安装依赖。\n第三步要运行测试。',       // 规则加强批:第X步计数用法不成链、教程不命中
  'First, define the goal.\nSecond, pick the metric.\nThird, review weekly.', // 规则加强批:英文链统计
  'First prize went to Alice. Second prize went to Bob. Finally, the prizes were distributed.', // 规则加强批追加:序数词修饰名词不成链
  '',                                     // 空文本
  '   \n\n  ',                            // 纯空白
  'Plain text with no tells at all, just a normal sentence.',        // 零命中
];

let checks = 0;
const cleanVariants = [
  undefined, // 默认选项(与 web 的 defaultOptions 完全一致)
  { invisible: true, markdown: true, typography: true, tracking: true, whitespace: true, homoglyph: true, plainText: false },
  { invisible: false, markdown: false, typography: false, tracking: false, whitespace: false, homoglyph: false, plainText: true },
];

for (const [i, text] of samples.entries()) {
  const label = `sample[${i}]`;
  // analyze 全量输出逐字段一致(命中位置、规则、分类、置信、why、指标、密度)
  assert.deepEqual(web.analyze(text), ext.analyze(text), `${label}: analyze`);
  checks++;
  // 忽略状态下的重算一致
  const first = web.analyze(text).findings.slice(0, 2).map(f => f.id);
  assert.deepEqual(web.analyze(text, new Set(first)), ext.analyze(text, new Set(first)), `${label}: analyze+ignored`);
  checks++;
  // clean:默认与两组开关组合,含文本、已处理数、剩余数与改动记录
  for (const [v, variant] of cleanVariants.entries()) {
    const opts = variant ?? web.defaultOptions;
    assert.deepEqual(web.defaultOptions, ext.defaultOptions, 'defaultOptions 必须一致');
    assert.deepEqual(web.clean(text, opts), ext.clean(text, opts), `${label}: clean#${v}`);
    checks++;
  }
  assert.equal(web.emojiSafeInvisible(text), ext.emojiSafeInvisible(text), `${label}: emojiSafeInvisible`);
  checks++;
}

// 3. 零命中边界:文案必须精确为「未发现当前规则覆盖的问题」,且该字符串存在于打包产物中。
const zero = web.analyze(samples.at(-1));
assert.equal(zero.findings.length, 0, '零命中样本文本不应产生命中');
assert.equal(web.analyze('').findings.length, 0);
assert.match(readFileSync(new URL('../popup.js', import.meta.url), 'utf8'), /未发现当前规则覆盖的问题/);
checks += 3;

// 3.5 规则加强批:ZH07 实验规则默认关闭(骨架文本零命中);scaffoldChains 只计数(中英链各计 1,第X步用法不计)。
const skeletonText = '首先要把目标拆小。\n\n其次要保持每天复盘。\n\n最后要坚持长期跟踪。';
assert.equal(web.analyze(skeletonText).findings.length, 0, 'ZH07 实验规则默认关闭,骨架文本不应产生命中');
assert.equal(web.analyze(skeletonText).scaffoldChains, 1, '中文序列骨架应计 1 条链');
assert.equal(web.analyze('第一步要准备环境。\n第二步要安装依赖。\n第三步要运行测试。').scaffoldChains, 0, '第X步计数用法不应成链');
assert.equal(web.analyze('First, define the goal.\nSecond, pick the metric.\nThird, review weekly.').scaffoldChains, 1, '英文序列骨架应计 1 条链');
assert.equal(web.analyze('First prize went to Alice. Second prize went to Bob. Finally, the prizes were distributed.').scaffoldChains, 0, '序数词修饰名词(first prize)不应成链');
checks += 5;

// 4. 打包完整性:popup.js 内联了全部启用句式规则;popup.html 引用 popup.js;manifest 引用的图标存在。
const popupJs = readFileSync(new URL('../popup.js', import.meta.url), 'utf8');
for (const id of ['EN01', 'EN02', 'EN05', 'EN08', 'EN10', 'ZH01', 'ZH02', 'ZH04', 'ZH05', 'ZH06']) {
  assert.ok(popupJs.includes(`'${id}'`) || popupJs.includes(`"${id}"`), `popup.js 缺少启用规则 ${id}`);
  checks++;
}
const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.action.default_popup, 'popup.html');
for (const p of Object.values(manifest.icons)) readFileSync(new URL(`../${p}`, import.meta.url));
assert.match(readFileSync(new URL('../popup.html', import.meta.url), 'utf8'), /popup\.js/);
checks += 4;

console.log(`✓ 一致性检查通过:${samples.length} 个共享样本 × analyze/ignored/clean×3/emojiSafeInvisible,共 ${checks} 项断言;打包引擎与 web/src/engine 输出完全相同。`);
} finally {
  rmSync(tmp, { force: true });
}
