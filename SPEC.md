# NoAITell · v1 产品简报

## 定位
- 品牌：NoAITell，域名 noaitell.com（已注册）。英文副标题：AI Text Cleaner。
- 一句话：粘贴 AI 生成的文本，自动标出所有 AI 破绽，一键清理干净。
- 真实需求：用户怕的不是文本脏，而是被看出是 AI 写的。破绽 = tell（扑克术语，露馅信号），如破折号滥用、AI 套话、隐形字符、Markdown 残留。
- 品牌路线：域名做品牌伞（检测 / 清理 / 改写 / 打分都能装），SEO 靠后续内页一页一词（ai text cleaner、ai tell checker、remove em dashes），不在 v1 范围。

## v1 范围（先俭版，只要核心闭环）
纯静态单页工具，无后端、无账号、无 AI 改写 API，全部在浏览器本地运行，不上传任何文本（页面需明示这一点）。

功能：
1. 输入区（可粘贴）+ 一段内置示例文本按钮，示例需包含各类破绽供演示。
2. 扫描并按类统计 + 高亮标出破绽：
   - 隐形字符：零宽空格 U+200B、U+FEFF、词连接符、软连字符、方向控制符、不换行空格等
   - Markdown 残留：**粗体**、# 标题、`代码`、[链接](url)、> 引用、列表符号
   - 标点 tell：破折号 —、–，弯引号 “ ” ‘ ’，单字符省略号 …
   - AI 套话：英文（delve、leverage、it's important to note、in today's fast-paced world、furthermore、moreover 等）+ 中文（值得注意的是、综上所述、在当今快速发展的时代、总而言之等），词表做成可增删的独立清单
   - 引用标记与跟踪：[1]、【†source】类标记，链接中的 utm_source=chatgpt.com 等跟踪参数
   - 空白问题：多余空格、连续空行、行尾空格
3. 总览：一共找到多少处破绽、按类计数、一个简单的破绽密度分数。
4. 清理选项（开关）：去隐形字符、去 Markdown、破折号转逗号或连字符、弯引号拉直、省略号转三点、去跟踪参数、合并多余空白；套话类只标出不自动改写（v1 不动用户词句，只提示）。
5. 一键清理 → 输出区显示结果 + 与原文的字数对比 + 复制按钮。
6. 页面下方简短说明区：这是什么、清掉哪些东西、隐私说明（本地运行）、FAQ 3-5 条（SEO 用，title/meta 含 "AI Text Cleaner"）。

不做：登录、付费、云端处理、AI 改写、浏览器插件（v2 再做）。

## 打底模板（减少从零开发）
- 检测/清理规则可基于 MIT 协议仓库改造（保留其 LICENSE 与版权声明）：
  - https://github.com/cronos3k/Text-Stealth-Watermark-Cleaner-Detector
  - https://github.com/pixelstrunk/watermark-cleaner
- 脚手架参考自家 knowhy-lab（Astro）与 video-insight 的结构与部署习惯。
- 注意：GS-Seven/textscopes、inaamilyas/ai-text-cleaner 无 LICENSE，只能看思路，禁止复制代码。

## UI 设计说明（要点，后续可再与 Gemini / 豆包讨论细化）
- 首屏即工具，不做营销式大横幅；品牌名 + 一句副标题 + 工具本体。
- 桌面端左右双栏（左输入、右输出/结果），移动端上下排布。
- 破绽按类别用不同颜色高亮，图例与计数同步显示；分数放在扫描结果顶部。
- 风格干净、工具感，浅色为主；按钮文案用动词：Scan / Clean / Copy。

## 技术与部署约束
- 静态站优先：可用 Astro 或纯静态 HTML/JS，保持零服务器依赖。
- 部署想法（未定）：Cloudflare Pages 连接本仓库自动部署，绑 noaitell.com。
- 文本处理必须是纯前端 JS，断网可用。

## 验收标准
- 粘贴示例文本，能检出上述每一类破绽且计数正确。
- 清理后输出无隐形字符、无 Markdown 符号残留，链接无跟踪参数。
- 全程无网络请求发送用户文本；移动端布局可用；复制按钮可用。

## 分工
- 实现：Terra / GLM 5.3 Flash（Codex 云端或本地 ZCode 均可）。
- 简报与验收：Andi。UI 设计说明讨论：Andi + Gemini / 豆包。
