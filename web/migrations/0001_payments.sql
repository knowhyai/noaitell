-- Test-only database. No raw payloads, card data, private keys, or cleaned text.
CREATE TABLE payment_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id TEXT NOT NULL,
  email TEXT NOT NULL,
  plan TEXT,
  status TEXT,
  period_start TEXT,
  period_end TEXT,
  event_time INTEGER NOT NULL,
  state_rank INTEGER NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE entitlements (
  order_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly', 'day')),
  status TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  state_time INTEGER NOT NULL,
  state_rank INTEGER NOT NULL,
  last_event_id TEXT NOT NULL
);
CREATE INDEX entitlements_email ON entitlements(email);
CREATE TRIGGER project_payment AFTER INSERT ON payment_events
WHEN NEW.plan IS NOT NULL AND NEW.status IS NOT NULL
BEGIN
  INSERT INTO entitlements (order_id, email, plan, status, period_start, period_end, state_time, state_rank, last_event_id)
  VALUES (NEW.order_id, NEW.email, NEW.plan, NEW.status, NEW.period_start, NEW.period_end, NEW.event_time, NEW.state_rank, NEW.id)
  ON CONFLICT(order_id) DO UPDATE SET
    email = excluded.email,
    plan = excluded.plan,
    status = excluded.status,
    period_start = COALESCE(excluded.period_start, entitlements.period_start),
    period_end = COALESCE(excluded.period_end, entitlements.period_end),
    state_time = excluded.state_time,
    state_rank = excluded.state_rank,
    last_event_id = excluded.last_event_id
  WHERE entitlements.status <> 'refunded' AND
    (excluded.state_time > entitlements.state_time OR
      (excluded.state_time = entitlements.state_time AND excluded.state_rank > entitlements.state_rank));
END;
-- Access is only valid with a known, unexpired billing period. A receipt alone
-- never extends a subscription: subscribe to renewed/recovered as well.
CREATE VIEW current_entitlements AS
SELECT * FROM entitlements
WHERE status IN ('active', 'canceling') AND period_start IS NOT NULL
  AND julianday(period_start) <= julianday('now') AND julianday(period_end) > julianday('now');
