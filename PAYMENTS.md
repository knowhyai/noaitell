# Waffo payments (test mode)

This integration follows [Waffo's official skill, Path B](https://docs.waffo.ai/zh/integrate/skill)
using the existing dashboard store. No stores, products, webhooks or Cloudflare
resources are created by application code. No live payments are enabled.

Monthly checkout uses the server-only `@waffo/pancake-ts` SDK from `web/functions`.
The browser posts `{ "plan": "monthly" }` to `/api/waffo/checkout` and navigates to
the returned `checkoutUrl` in the same tab. Product price comes from Waffo, never
the browser. Success returns to `https://noaitell.com`; that redirect grants no access.
The checkout page collects the buyer's email. No login/account system is included.

## Configuration

Use Node 20+ and the existing Cloudflare Pages project with `web` as its root,
`npm run build` as build command and `dist` as output. Deploy from `web` so Pages
includes its sibling `functions/` directory. `_routes.json` invokes Functions only
for `/api/waffo/*`; static cleaning remains static. `nodejs_compat` exposes runtime
bindings through `process.env` and supports the SDK's Node crypto implementation.

In Pages Settings → Variables and Secrets, set the following runtime values for
both the deployment environment you use and local testing. Redeploy after changes.
Never prefix credentials with `VITE_` or add them to frontend build substitutions.

| Name | Value/source |
| --- | --- |
| `WAFFO_MERCHANT_ID` | `MER_4Ol0Zkff9a43WmPKgp3ae6` |
| `WAFFO_PRIVATE_KEY` | **Secret**, test RSA private key from the existing dashboard API key |
| `WAFFO_STORE_ID` | `STO_4ZCSNbjIGj2BxBFxKNwJGE` |
| `WAFFO_PRODUCT_MONTHLY` | Complete existing `NoAITell Pro Monthly` product ID from Dashboard → Products; USD 19.90/month, SaaS |
| `WAFFO_PRODUCT_DAY` | Optional; leave unset until the USD 4.99 one-time 24-hour Day Pass exists |
| `WAFFO_PRODUCT_YEARLY` | Optional; leave unset until the USD 199/year subscription exists |

The truncated monthly ID is deliberately not guessed. No API-key lookup or remote
write is needed. Application code reads `process.env.WAFFO_PRIVATE_KEY` and
`process.env.WAFFO_MERCHANT_ID`, never `WAFFO_API_KEY`. Keep key material outside the
repository, including local PEM files. The SDK accepts literal escaped newlines
in a secret. `web/.dev.vars.example` contains placeholders only. For local Wrangler
sessions, supply the real values via ignored `web/.dev.vars` or runtime injection;
never paste secrets into shell command arguments, logs, issues or commits.

Stay on **Workers/Pages Free and D1 Free**. Do not upgrade billing or add paid
Queues, KV, Durable Objects, Analytics Engine, or other metered extras. Free quota
exhaustion should stop requests rather than enable overage billing.

Create/select a free-tier D1 database named `noaitell-payments-test`. Bind it as
`PAYMENTS_DB` in Pages Settings → Bindings, and apply the migration before use:

```sh
cd web
npx wrangler d1 execute noaitell-payments-test --remote --file=migrations/0001_payments.sql
```

If managing bindings in Wrangler, uncomment the `d1_databases` block in
`web/wrangler.toml`, replacing its placeholder ID with the real free D1 ID. Ensure
the deployed binding remains `PAYMENTS_DB`. For local development configure that
block, then run the same command with `--local` instead of `--remote` and:

```sh
npm ci
npm run build
npx wrangler pages dev dist
```

Vite alone does not serve Pages Functions. Missing product IDs return 503 with a
friendly checkout error. Monthly pricing and home links use the current design.
Day/Yearly UI stays in launch-notification mode; the endpoint supports those plan
names once their real product IDs are supplied. Planned Pro features and quota
unlocking are not implemented: test checkout records test entitlements only.
Free remains 3 cleanings/day and 500 words per cleaning.

## Dashboard webhook (manual registration only)

Paste **https://noaitell.com/api/waffo/webhook** into the existing store's
**test-mode HTTP webhook** configuration. Select the **Raw payload format** that
includes `x-waffo-signature`. No webhook registration API is called.
Subscribe to:

- `subscription.activated`
- `subscription.payment_succeeded`
- `subscription.renewed`
- `subscription.recovered`
- `subscription.canceling`
- `subscription.uncanceled`
- `subscription.canceled`
- `subscription.past_due`
- `subscription.plan_changed`
- `refund.succeeded`
- `order.completed` (for a future Day Pass)

The handler uses `request.text()` and `verifyWebhook(body, signature,
{ environment: 'test' })`, with the SDK's built-in public key and replay checks.
It also rejects other stores and non-test payloads. No webhook signing secret is
needed. Invalid signatures return 401 before any database access.

A single bounded D1 insert durably records `event.id` before returning 200. A
SQLite trigger projects entitlement changes in the same transaction. This avoids
a background task loss window while keeping acknowledgment fast: no remote API
calls or follow-up jobs run in the webhook. Concurrent duplicate deliveries do
nothing. Database/projection failures roll back and return 503 so Waffo can retry.
No raw payloads, card data, drafts or SDK error details are logged or stored.

`payment_events` records deliveries; `entitlements` stores email, order ID, plan,
status and period. `current_entitlements` exposes active/canceling orders only
within their known billing period. Canceling keeps access to period end; canceled
and past_due disable it immediately. Recovery restores access. A successful
refund conservatively revokes that order (including partial refunds), pending a
future finer-grained refund policy. Other orders for the same email are separate.
Older state events cannot overwrite newer state, and equal-timestamp events favor
revocation. Refund revocation is terminal for that order.

Payment receipts are recorded but never invent or extend billing dates. Current
Waffo SDK payloads put dates on `subscription.renewed` and other subscription
state events, not `subscription.payment_succeeded`. Unknown product names without
our `orderMetadata.noaitellPlan` remain event records only; they grant no access.
For dashboard-initiated orders without metadata, supported names are exactly
`NoAITell Pro Monthly`, `NoAITell Pro Yearly`, and `NoAITell Pro Day Pass`.

Inspect Waffo's delivery logs after a test checkout, plus the D1 event and
entitlement rows. Redeliver failed notifications through Waffo after resolving a
storage/configuration failure. Retain delivery IDs for deduplication; fulfill
privacy deletion requests for test email/order records according to your policy.
No public email-to-entitlement lookup is exposed.

Use Waffo's successful test card `4576750000000110`, any future expiry and CVC.
Check activation, renewal, cancellation, failed payment and refund in test mode.
Production requires separately reviewed production keys/products, production
verification and an isolated database; changing a secret alone does not switch
this hardcoded test integration to production.

## Validation

```sh
cd web
npm ci
npm run build
npm test
python3 scripts/payments-db.test.py
```

The build type-checks frontend and Functions separately. Vitest covers request
validation, server-selected checkout parameters, redacted failures, invalid
webhook signatures (401) and period mapping. Python's standard-library SQLite
tests exercise the actual D1 migration, duplicate delivery behavior, rollback,
out-of-order states, expiration, recovery and refunds.
