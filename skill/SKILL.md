---
name: noaitell
description: >-
  Scan text for AI writing tells with the NoAITell engine and optionally clean
  the selectable ones. Detects format residue (Markdown leftovers, extra
  whitespace), typography characters (em/en dashes, curly quotes, ellipsis in
  English), sentence patterns / 模板化表达 (rule-based EN+ZH tell patterns),
  link tracking parameters (utm_*, fbclid, gclid), citation markers, invisible
  characters, and mixed-script homoglyphs. Reports per-category findings and
  hit-density metrics; applies only the cleanups the user selected. Never
  rewrites sentence patterns. Use when the user asks to check or clean AI
  tells / AI 痕迹 / 格式残留 / "does this look AI-written", remove em dashes,
  Markdown residue, invisible characters, or tracking parameters from text
  before publishing.
---

# NoAITell — AI Text Cleaner(Agent Skill)

检查并清理 AI 文本中的格式残留与模板化表达。本 skill 使用与 noaitell.com 网页版**完全相同的检测引擎**(`engine/engine.mjs`,从 `web/src/engine` 同源打包),全部在本机运行,不上传任何文本。

## 何时使用

- 用户要求检查文本是否有 AI 痕迹 / AI tells / 格式残留,再决定是否发布。
- 用户要求移除 em dash、Markdown 残留、隐形字符、链接跟踪参数等可清理项。
- 用户写完或改写完一段文案,想要一份「哪里像模板化表达」的逐项报告。

不适用:判断文本「是否由 AI 生成」(本工具不做来源判断,也不构成「真人证明」);绕过任何 AI 检测系统。

## 前置条件

Node.js ≥ 18,无任何运行时依赖。所有命令中的 `<skill_dir>` 指本 skill 目录(含 `noaitell.mjs` 的目录)。

## 确切工作流(严格按此顺序)

### 1. 获取文本
把要检查的完整文本保存为文件,或准备通过 stdin 传入。不要截断、不要改写原文。

### 2. 扫描(只报告,不修改)

```bash
node <skill_dir>/noaitell.mjs --json <文本文件>
# 或:cat 文本 | node <skill_dir>/noaitell.mjs --json
```

JSON 输出结构:

```json
{
  "analysis": { "visibleChars": 0, "patternHits": 0, "formatHits": 0, "reviewCount": 0, "invisibleCount": 0, "density": null },
  "findings": [ { "id": "EN01:6:30", "ruleId": "EN01", "category": "pattern", "confidence": "high", "start": 6, "end": 30, "text": "…", "label": "…", "why": "…", "cleanable": false } ]
}
```

`category` 取值:`format`(复制与格式残留)/ `typography`(排版与字符)/ `pattern`(模板化表达)/ `link`(链接隐私)。`cleanable: false` 表示只提示、不可自动清理。`density` 为句式命中密度(处/千可见字符),`null` 表示短文本(可见字符 <150)只计次数、不判高低。

### 3. 向用户报告(必须逐项)

- 按四个分类汇总命中数与密度指标;密度口径:`analysis.density` 处/千可见字符(或「短文本仅显示次数」)。
- 逐项列出:规则 ID、名称、置信(高/中/低)、命中原文、位置;`why` 字段已含解释(位置 → 句式 → 为什么值得复核)。
- **零命中时必须精确使用这句话**:「未发现当前规则覆盖的问题」,并补充:基于当前规则与统计特征,不构成「真人证明」。禁止任何「100% 真人」「保证过检」类表述。
- 不可见字符(`CHAR01`)只计入统计(`invisibleCount`),不在逐项报告里展开位置。

### 4. 让用户选择清理项(绝不自动清理)

只列这些开关并等待用户选择,默认值与网页版一致:

| 开关 | 默认 | 说明 |
| --- | --- | --- |
| invisible(去隐形字符) | 开 | emoji-safe:保留 emoji 组合所需 ZWJ/ZWNJ |
| markdown(清理 Markdown 残留) | 开 | 仅「纯文本发布」模式生效 |
| tracking(去链接跟踪参数) | 开 | 只移除已知跟踪参数(utm_*、fbclid、gclid),保留功能参数 |
| whitespace(合并多余空白) | 开 | |
| typography(统一英文标点) | 关 | 弯引号拉直、破折号转连字符、省略号转三点;仅英文文本 |
| homoglyph(修正同形字) | 关 | 词内混排脚本的仿冒字母归一化 |
| keep-markdown(保留 Markdown) | 关 | 输出模式二选一:纯文本发布 / 保留 Markdown |

### 5. 应用用户选定的清理

```bash
node <skill_dir>/noaitell.mjs --clean --json [--typography] [--homoglyph] [--keep-markdown] [--no-invisible] [--no-markdown] [--no-tracking] [--no-whitespace] <文本文件>
```

输出中的 `clean.text` 为清理后文本,`processed` 为已处理命中数,`remaining` 为剩余待复核数(句式与引用标记不计入已处理)。清理始终从原始文本重新计算,不存在累积应用;如需撤销,保留原文重新运行即可。

### 6. 交付
给出清理后全文、已处理/剩余计数,并提醒:句式类命中与引用标记仍需人工复核。

## 硬性规则

1. **句式(`category: pattern`)绝不自动改写**——无论用户多么着急,只能报告并建议人工复核;清理选项中不存在句式开关。
2. **引用标记(`CITE01`)只提示、永不删除**(学术与合法引用可能被误伤)。
3. **invisible 字符只统计**,向用户报告计数即可。
4. 全程本地运行;不要把文本内容发到任何网络服务;统计与报错不携带文本内容。
5. 报告与结论不得声称判断了文本来源。

## 快速自测

```bash
node <skill_dir>/noaitell.mjs <skill_dir>/test/sample.txt   # 文本报告
node <skill_dir>/noaitell.mjs --json --clean <skill_dir>/test/sample.txt  # JSON + 清理
```

## 维护(仓库内)

`engine/engine.mjs` 是生成文件,由 `skill/scripts/build.mjs` 从 `web/src/engine` 打包,**不要手改**。引擎更新后:在仓库 `skill/` 目录运行 `npm run build && npm test`——`test/smoke.mjs` 会把打包引擎与 `web/src/engine` 的现场编译结果在 27 个共享样本上逐字段比对。
