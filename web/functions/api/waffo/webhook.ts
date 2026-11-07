import { verifyWebhook } from '@waffo/pancake-ts';
import { project, type PaymentEvent } from '../../lib/events';
import type { Context } from '../../lib/platform';

export async function onRequest({ request, env }: Context): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  const body = await request.text(); // Exact signed bytes; never request.json().
  let event: PaymentEvent;
  try {
    event = verifyWebhook(body, request.headers.get('x-waffo-signature'), { environment: 'prod' });
  } catch { return new Response('Invalid signature', { status: 401 }); }
  if (event.mode !== 'prod' || !env.WAFFO_STORE_ID || event.storeId !== env.WAFFO_STORE_ID) {
    return new Response('Unexpected store or environment', { status: 403 });
  }
  let projection: ReturnType<typeof project>;
  try { projection = project(event); }
  catch { return new Response('Invalid event', { status: 400 }); }
  if (!env.PAYMENTS_DB) return new Response('Payments storage unavailable', { status: 503 });
  try {
    // One bounded durable write before ACK. The SQLite trigger projects access in
    // the SAME transaction, avoiding lost background jobs and deduplication races.
    await env.PAYMENTS_DB.prepare(`INSERT INTO payment_events
      (id, event_type, order_id, email, plan, status, period_start, period_end, event_time, state_rank)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
      .bind(event.id, event.eventType, event.data.orderId, projection.email,
        projection.plan, projection.status, projection.start, projection.end,
        projection.time, projection.rank).run();
  } catch {
    // No ACK on storage failure: Waffo must retry. No payload/error logging.
    return new Response('Payments storage unavailable', { status: 503 });
  }
  return new Response('OK', { headers: { 'Cache-Control': 'no-store' } });
}
