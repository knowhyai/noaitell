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

Launch build: run `npm ci`, `npm run build`, and `npx vitest run` from web/.
Tests build the static output once before checking it. Page content is maintained in
content/pages/*.json; scripts/pages.mjs renders HTML during development and builds.
The Vite entry list comes from that content catalog. Duplicate legacy routes are
301 redirects in public/_redirects and are omitted from the sitemap.

Cloudflare Pages: project name noaitell, build command npm run build, root directory
web, output directory dist. wrangler.toml declares the output directory.
Deployment and DNS changes are separate manual operations; this work does neither.

The free allowance is three cleanings per local calendar day, 500 segmented words
per cleaning. Only the date and count are stored in localStorage; drafts are not saved.
Scanning does not spend an allowance. Pro checkout is disabled. No account, webhook,
D1 database, payment credentials, or text upload endpoint is included.

Optional measurement and verification (static build). Nothing is connected by
default. Set any of these in `.env` or in the Cloudflare Pages build environment,
then rebuild. Empty or invalid values emit no tag, script, or link.

| Key | When set |
| --- | --- |
| `VITE_GSC_VERIFICATION` | `<meta name="google-site-verification">` |
| `VITE_BING_VERIFICATION` | `<meta name="msvalidate.01">` |
| `VITE_GA4_ID` | GA4 loader, only for an id shaped like `G-XXXXXXXX` |
| `VITE_CLARITY_ID` | Clarity loader. The cleaner stays masked from recordings. |
| `VITE_NEWSLETTER_URL` | An https Newsletter link in the footer. Omitted when unset. |

`npm run check:integrations` prints configured, missing, or invalid for each key
and always exits 0, including when it runs during `npm run build`. It does not
print the values. No identifiers are included by default. Pro requests are
positioned as previews and notifications open the visitor's email app; there is
no backend or website email database.

## Static i18n framework

Locales are declared in `content/locales.json` as a list of records
`{code, name, enabled, indexable, htmlLang}`:

- `code` is a lowercase url-safe identifier. `en` is the default locale and the
  only one required; when enabled alone it is served at the root and all URLs
  stay unchanged. Currently only `en` is enabled.
- `htmlLang` is the value used for `<html lang>` and for `hreflang` attributes.
- `indexable: false` marks the whole locale as not ready for search engines:
  its pages get `<meta name="robots" content="noindex">` and are excluded from
  the sitemap and from hreflang alternate groups. A disabled locale is skipped
  entirely at build time, and its content is never generated or shipped.

English page files stay in `content/pages/<slug>.json` (`home.json` for `/`).
Any other enabled locale builds from a full independent copy set under
`content/locales/<code>/` using the same record shape. Translations are never
derived from or merged back into English at build time: a non-en page without
its own file under `content/locales/<code>/` is simply not generated for that
locale, and English content is never used as a fallback for it.

Build-time behavior driven by the config:

- Pages of a non-en enabled locale are written to `/<code>/<slug>/` (the locale
  home page is `/<code>/`) and get `<html lang>` plus a canonical URL for that
  path. Vite picks up the extra HTML inputs from the same page catalog.
- The header language switcher (`nav.lang-switcher`) is rendered only when more
  than one locale is enabled; each entry links to the same page in another
  locale (falling back to that locale's home page) and the current locale is
  marked with `aria-current="true"`. Navigation, guide and footer links point at
  the same-locale page when it exists, otherwise at the English page.
- `hreflang` alternate `<link rel="alternate">` tags (including
  `hreflang="x-default"` pointing at the English page) are emitted only for
  pages that exist in two or more indexable enabled locales. A page that exists
  in a single locale gets no alternates at all — with only `en` enabled the
  built output therefore contains none.
- `public/sitemap.xml` lists every page of every enabled, indexable locale and
  adds `xhtml:link rel="alternate" hreflang=...` entries (including
  `x-default`) to the `<url>` records of pages that exist in multiple such
  locales.

Content policy for any new locale: copies must keep the established product
positioning — the tool cleans formatting artifacts and helps the user review
any writing pattern themselves so the result sounds natural. New or translated
copy must never claim to trick, evade, or defeat plagiarism or writing-pattern
checks, and must not promise full watermark removal.

`scripts/i18n.test.ts` covers config validation, the one-locale switcher
behavior, and per-locale page generation, hreflang, noindex and sitemap output
using a temporary fixture directory; no second locale exists in real content.
