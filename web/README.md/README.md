# 网页版（web/）
NoAITell 网站本体，部署目标 noaitell.com（纯静态、浏览器本地运行、不上传文本）。
- 本目录是检测引擎的源头：引擎写成无 DOM 依赖的纯模块（engine/），extension/ 与 skill/ 复用同一套规则与引擎。
- 需求与验收以仓库根目录 SPEC.md、UI.md、RULES.md 为准。
- 落地页与各关键词内页（ai tell checker / remove em dashes / ai text cleaner 及各助手残留页）也在此目录内实现，视觉规范遵循 landing-page-design skill。

## Static pages and local preview

Run `npm run dev` from `web/` for a local preview. Run `npm run build` for the production `dist/` directory, or `npm test` to build and run all Vitest checks.

Edit page copy in `content/pages/<slug>.json` (`home.json` for `/`). Each record owns its title, H1, description, explanatory HTML and tool visibility. `scripts/pages.mjs` writes the HTML entry points and sitemap; Vite discovers its inputs from the same registry. Generated HTML includes all explanatory text before JavaScript runs. The client mounts the cleaner only inside `#app`.

`public/_redirects` consolidates the former cleaner alias into `/` and the former Gemini alias into `/gemini-ai-watermark/`. Add new pages to the content directory rather than copying an existing HTML shell. Build output uses canonical URLs under `https://noaitell.com`.

The free quota counts successful cleaning requests, not scans, with three uses per local calendar day and 500 words per use. Only the date and count are persisted in localStorage; this browser-only limit is not a server-enforced entitlement. Pro plans and Creem payments are previews, with disabled upgrade buttons. Accounts, payment processing and backend storage are reserved for phase 2.

Cloudflare Pages configuration is in `wrangler.toml`; use `web/` as the project root and `npm run build` as the build command. Deployment and DNS changes are separate steps and have not been performed.
