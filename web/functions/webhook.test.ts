import { afterEach, expect, it, vi } from 'vitest';
import { onRequest } from './api/waffo/webhook';
import type { PaymentEvent } from './lib/events';

const { verify } = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock('@waffo/pancake-ts', () => ({ verifyWebhook: verify }));
afterEach(() => vi.clearAllMocks());
const event: PaymentEvent = {
  id: 'delivery-1', mode: 'test', storeId: 'existing-store', timestamp: '2026-11-07T00:00:00Z',
  eventType: 'subscription.activated', data: { orderId: 'order-1', buyerEmail: 'buyer@example.com',
    productName: 'NoAITell Pro Monthly', currentPeriodStart: '2026-11-07T00:00:00Z', currentPeriodEnd: '2026-12-07T00:00:00Z' },
};
function context() {
  const run = vi.fn().mockResolvedValue({ success: true });
  const bind = vi.fn().mockReturnValue({ run });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { request: new Request('https://noaitell.com/api/waffo/webhook', {
    method: 'POST', body: '{  "raw": true }\n', headers: { 'x-waffo-signature': 'test-header' },
  }), env: { WAFFO_STORE_ID: 'existing-store', PAYMENTS_DB: { prepare } }, run, bind, prepare };
}
it('passes the exact raw body and explicit test environment to the SDK and durably records the delivery', async () => {
  verify.mockReturnValue(event);
  const ctx = context();
  expect((await onRequest(ctx)).status).toBe(200);
  expect(verify).toHaveBeenCalledWith('{  "raw": true }\n', 'test-header', { environment: 'test' });
  expect(ctx.bind).toHaveBeenCalledWith('delivery-1', 'subscription.activated', 'order-1', 'buyer@example.com',
    'monthly', 'active', '2026-11-07T00:00:00.000Z', '2026-12-07T00:00:00.000Z', Date.parse(event.timestamp), 1);
  expect(ctx.run).toHaveBeenCalledOnce();
});
it.each([{ ...event, mode: 'prod' }, { ...event, storeId: 'other-store' }])('rejects unexpected store or mode before persistence', async payload => {
  verify.mockReturnValue(payload);
  const ctx = context();
  expect((await onRequest(ctx)).status).toBe(403);
  expect(ctx.prepare).not.toHaveBeenCalled();
});
it('returns 503 on D1 failure so the delivery will be retried', async () => {
  verify.mockReturnValue(event);
  const ctx = context();
  ctx.run.mockRejectedValue(new Error('internal details'));
  const response = await onRequest(ctx);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('internal');
});
