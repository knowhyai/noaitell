# 网页版（web/）
NoAITell 网站本体，部署目标 noaitell.com（纯静态、浏览器本地运行、不上传文本）。
- 本目录是检测引擎的源头：引擎写成无 DOM 依赖的纯模块（engine/），extension/ 与 skill/ 复用同一套规则与引擎。
- 需求与验收以仓库根目录 SPEC.md、UI.md、RULES.md 为准。
- 落地页与各关键词内页（ai tell checker / remove em dashes / ai text cleaner 及各助手残留页）也在此目录内实现，视觉规范遵循 landing-page-design skill。
