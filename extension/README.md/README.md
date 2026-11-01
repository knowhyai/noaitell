# Chrome 插件（extension/）
NoAITell 的 Chrome 扩展：在复制/粘贴发生的当下提供同样的破绽检查与清理。
- 复用 web/ 的检测引擎与规则（同一份代码，不另写一套）。
- 排期：网站版验证通过之后开发；本目录先立结构与说明。
- 竞争窗口：当前头部竞品均无 Chrome 插件，此为优先抢占项（见 DISCUSSION.md 竞品结论）。

## 目录结构
- `manifest.json` — Manifest V3 清单；仅声明弹出界面与图标，不需要任何权限（无 host 权限、无后台脚本、无内容脚本）。
- `popup.html` / `popup.css` / `popup.js` — 弹窗界面。`popup.js` 为构建产物（引擎已内联），由 `src/popup.ts` 打包生成。
- `src/popup.ts` — 弹窗逻辑，移植自 `web/src/main.ts`：粘贴文本 → 按分类高亮命中 → 选择清理选项 → 清理 → 复制结果。
- `engine.js` — 构建产物：`web/src/engine` 的独立 ESM 打包，供一致性检查比对。
- `icons/` — 占位图标（品牌蓝底白色菱形），正式图标就绪后直接替换；可用 `npm run icons` 重新生成。
- `scripts/` — `build.mjs`（esbuild 打包）、`gen-icons.mjs`（占位图标生成）、`smoke.mjs`（一致性检查）。

## 行为一致性（与网页版）
弹窗复用与网页版完全相同的引擎与工作流，并遵守同样的红线：
- 默认开启相同的初始规则与清理选项（`defaultOptions` 直接从共享引擎导入）。
- 句式（模板化表达）与引用标记只标记提示，绝不自动改写或删除。
- 不可见字符只计入统计（摘要区显示计数），不做正文内联高亮。
- 零命中时文案必须精确为「未发现当前规则覆盖的问题」。

## 构建与测试
```bash
cd extension
npm install
npm run build    # 生成 popup.js 与 engine.js（从 web/src/engine 打包）
npm test         # tsc 类型检查 + smoke.mjs 一致性检查
```
`scripts/smoke.mjs` 会把提交在库中的打包引擎与 `web/src/engine` 的现场编译结果在 27 个共享样本文本上逐字段比对（analyze 全量命中、忽略重算、三组清理选项的 clean 输出、emoji-safe 不可见字符清理、默认选项、零命中文案、打包完整性），任何漂移都会使测试失败。**修改 `web/src/engine` 后必须回到本目录重新 `npm run build` 并 `npm test`。**

## 未打包加载（Load unpacked）
1. 打开 Chrome，进入 `chrome://extensions`。
2. 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本仓库的 `extension/` 目录（务必选目录本身，而不是 `popup.html` 所在的上一级）。
4. 固定到工具栏后点击 NoAITell 图标即可使用；所有检测与清理均在本机完成，文本不会离开设备。

> 说明：`popup.js` 与 `engine.js` 是提交在库中的构建产物，目的是让克隆仓库后无需构建即可「加载已解压的扩展程序」；改动源码后请用 `npm run build` 重新生成。
