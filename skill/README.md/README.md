# Skill 版（skill/）
把 NoAITell 的规则集打包成可被编程 Agent（Codex / Claude Code / Cursor 等）直接调用的 skill：在写作流水线里自动跑同一套检查。
- 内容：SKILL.md（用法说明）+ 规则数据（与 web/ 引擎同源导出）。
- 排期：引擎稳定后导出；本目录先立结构与说明。

## 目录结构
- `SKILL.md` — Agent Skill 说明文件（frontmatter + 何时使用 + 确切工作流 + 硬性规则）。
- `noaitell.mjs` — 命令行入口：从文件或 stdin 读取文本，以 JSON 或文本输出命中报告与密度指标；`--clean` 附带清理后文本。运行时零依赖，Node.js ≥ 18。
- `engine/engine.mjs` — 打包后的引擎（由 `scripts/build.mjs` 从 `web/src/engine` 同源打包，生成文件，请勿手改）。整目录可拷走独立使用。
- `test/sample.txt` — 共享样本文本（覆盖各类命中，含不可见字符与引用标记）。
- `test/smoke.mjs` — 一致性检查：打包引擎 vs `web/src/engine` 现场编译，27 个共享样本逐字段比对 + CLI 输出检查。
- `scripts/build.mjs` — 重新打包引擎（需要 esbuild，仅开发依赖）。

## 使用
```bash
node noaitell.mjs test/sample.txt              # 文本报告:分类命中 + 密度指标
node noaitell.mjs --json test/sample.txt       # JSON(供程序解析)
node noaitell.mjs --clean --json test/sample.txt  # 附带清理后文本(默认选项与网页版一致)
echo '文本' | node noaitell.mjs --json          # stdin 输入
```
默认清理选项与网页版完全一致;句式(模板化表达)与引用标记只报告、绝不改写或删除;不可见字符只计入统计;零命中时输出「未发现当前规则覆盖的问题」。完整工作流见 `SKILL.md`。

## 构建与测试
```bash
cd skill
npm install     # 仅装 esbuild(开发依赖),运行时零依赖
npm run build   # 从 web/src/engine 重新打包 engine/engine.mjs
npm test        # 一致性检查(需在仓库内运行)
```
**修改 `web/src/engine` 后必须回到本目录重新 `npm run build` 并 `npm test`**,保证 skill 与网页版引擎输出完全相同。
