export interface PaymentEvent {
  id: string; timestamp: string; eventType: string; storeId: string; mode: string;
  data: {
    orderId: string; buyerEmail: string; productName: string;
    currentPeriodStart?: string; currentPeriodEnd?: string;
    orderMetadata?: Record<string, unknown>;
  };
}
const statuses: Record<string, string> = {
  'subscription.activated': 'active', 'subscription.renewed': 'active',
  'subscription.recovered': 'active', 'subscription.uncanceled': 'active',
  'subscription.plan_changed': 'active', 'subscription.canceling': 'canceling',
  'subscription.canceled': 'canceled', 'subscription.past_due': 'past_due',
  'refund.succeeded': 'refunded', 'order.completed': 'active',
};
const ranks: Record<string, number> = { active: 1, canceling: 2, past_due: 3, canceled: 4, refunded: 5 };
const names: Record<string, string> = {
  'NoAITell Pro Monthly': 'monthly', 'NoAITell Pro Yearly': 'yearly', 'NoAITell Pro Day Pass': 'day',
};
function date(value?: string): string | null {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}
export function project(event: PaymentEvent) {
  if (!event.id || !event.data?.orderId || !event.data.buyerEmail || !Number.isFinite(Date.parse(event.timestamp))) {
    throw new Error('Invalid event');
  }
  const metadataPlan = event.data.orderMetadata?.noaitellPlan;
  const plan = typeof metadataPlan === 'string' && ['monthly', 'yearly', 'day'].includes(metadataPlan)
    ? metadataPlan : names[event.data.productName];
  const handled = event.eventType in statuses || event.eventType === 'subscription.payment_succeeded';
  const status = statuses[event.eventType] ?? null;
  const start = date(event.data.currentPeriodStart) ?? (plan === 'day' && event.eventType === 'order.completed' ? date(event.timestamp) : null);
  const end = date(event.data.currentPeriodEnd) ?? (start && plan === 'day' ? new Date(Date.parse(start) + 86400000).toISOString() : null);
  return {
    plan: handled ? plan ?? null : null, status, rank: status ? ranks[status] : 0,
    email: event.data.buyerEmail.trim().toLowerCase(), start, end,
    time: Date.parse(event.timestamp),
  };
}
