import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequest as checkout } from './api/waffo/checkout';
import { onRequest as webhook } from './api/waffo/webhook';
import { project } from './lib/events';
import type { Context } from './lib/platform';

const { createSession } = vi.hoisted(() => ({ createSession: vi.fn() }));
vi.mock('./lib/waffo', async importOriginal => {
  const original = await importOriginal<typeof import('./lib/waffo')>();
  return { ...original, createClient: () => ({ checkout: { createSession } }) };
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
function request(body: string, headers = {}, method = 'POST'): Context {
  return { request: new Request('https://noaitell.com/api/waffo/checkout', {
    method, headers: { Origin: 'https://noaitell.com', 'Content-Type': 'application/json', ...headers },
    ...(method === 'POST' ? { body } : {}),
  }), env: {} };
}
describe('checkout validation', () => {
  it.each(['null', '[]', '{}', '{', '{"plan":"invalid"}', '{"plan":"monthly","priceSnapshot":{"amount":"0"}}', '{"plan":"monthly","successUrl":"https://example.com"}'])('rejects %s before calling Waffo', async body => {
    expect((await checkout(request(body))).status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });
  it('rejects cross-origin requests and non-JSON bodies', async () => {
    expect((await checkout(request('{}', { Origin: 'https://example.com' }))).status).toBe(403);
    expect((await checkout(request('{}', { 'Content-Type': 'text/plain' }))).status).toBe(415);
    expect((await checkout(request('', {}, 'GET'))).status).toBe(405);
  });
  it('fails closed for a missing product, including future plans', async () => {
    for (const plan of ['monthly', 'day', 'yearly']) {
      vi.stubEnv(`WAFFO_PRODUCT_${plan === 'day' ? 'DAY' : plan.toUpperCase()}`, '');
      expect((await checkout(request(JSON.stringify({ plan })))).status).toBe(503);
    }
  });
  it('creates a session with only server-selected product, currency and success URL', async () => {
    vi.stubEnv('WAFFO_PRODUCT_MONTHLY', 'PROD_testMonthly');
    createSession.mockResolvedValue({ checkoutUrl: 'https://pancake.waffo.ai/store/test/checkout/session' });
    const response = await checkout(request('{"plan":"monthly"}'));
    expect(response.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith({ productId: 'PROD_testMonthly', currency: 'USD',
      successUrl: 'https://noaitell.com', metadata: { noaitellPlan: 'monthly' } });
    expect(await response.json()).toEqual({ checkoutUrl: 'https://pancake.waffo.ai/store/test/checkout/session' });
  });
  it('does not disclose SDK errors', async () => {
    vi.stubEnv('WAFFO_PRODUCT_MONTHLY', 'PROD_testMonthly');
    createSession.mockRejectedValue(new Error('sensitive upstream request details'));
    const response = await checkout(request('{"plan":"monthly"}'));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('sensitive');
  });
});

it.each([undefined, 'bad-signature', `t=${Date.now()},v1=invalid`])('returns 401 for an invalid webhook signature without touching D1', async signature => {
  const context = request('{ "not": "a verified event" }', signature ? { 'x-waffo-signature': signature } : {});
  const prepare = vi.fn();
  context.env.PAYMENTS_DB = { prepare };
  const response = await webhook(context);
  expect(response.status).toBe(401);
  expect(prepare).not.toHaveBeenCalled();
});

it('uses authoritative subscription periods and does not infer them from payment receipts', () => {
  const event = { id: 'delivery', storeId: 'store', mode: 'test', timestamp: '2026-11-07T00:00:00Z',
    eventType: 'subscription.payment_succeeded', data: { orderId: 'order', buyerEmail: 'Buyer@Example.com', productName: 'NoAITell Pro Monthly' } };
  expect(project(event)).toMatchObject({ plan: 'monthly', status: null, start: null, end: null, email: 'buyer@example.com' });
  expect(project({ ...event, eventType: 'subscription.canceling', data: { ...event.data,
    currentPeriodStart: '2026-11-01T00:00:00Z', currentPeriodEnd: '2026-12-01T00:00:00Z' } })).toMatchObject({ status: 'canceling', end: '2026-12-01T00:00:00.000Z' });
});
