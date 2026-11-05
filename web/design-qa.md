# AC hybrid validation

References: strategy `mockups/ac.html`, `ac-390.png`, `ac-1280.png`,
`design-qa.md`, and `refs-gefei/wisprflow.ai.png`.

- Paper background; locally hosted Lora and DM Sans from the supplied mockup,
  with OFL notices. Headline is 88px desktop / 64px mobile, above the reference's
  67px / 53px. Red #B34335 is the sole accent, including findings and favicon.
- One shared brand and one primary cleaning button. Full-width editor and
  inline findings/options retain the local cleaner's review and diff behavior.
- English landing copy is in `content/locales/en/home.json`; the page generator
  overlays this on the default English records without adding routes.
- Chromium at 1280×800 and 390×844: no horizontal overflow or page errors;
  button bottoms are 783.69px and 813.09px respectively, both with an empty
  editor and after loading the example. Empty/whitespace input disables the
  grey button; text enables the red button. Cleaning opens the diff.
- Text contrast: muted on paper 4.65:1, red on paper 4.95:1, button text on
  red 5.48:1, red on the light finding tint 4.88:1. Controls and navigation
  targets have minimum 44px dimensions; option labels have 44px height.
- How it works, Common AI tells, FAQs with FAQPage schema, pricing card, and
  the truthful local-processing trust line remain present.
- `npm --prefix web run build` passes; `npm --prefix web test` passes all
  175 tests. Sitemap remains 17 URLs. Metadata checks accept heading attributes;
  the old duplicate-header test now checks for a shared brand and one CTA.
