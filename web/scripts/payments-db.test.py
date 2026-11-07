"""Exercise the actual D1 SQLite schema, transaction and entitlement rules."""
import sqlite3
import unittest
from pathlib import Path


class PaymentsDatabaseTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.executescript((Path(__file__).parents[1] / 'migrations/0001_payments.sql').read_text())

    def event(self, id='e1', status='active', time=1, rank=1, end='2099-12-01T00:00:00Z', order='o1'):
        self.db.execute('''INSERT INTO payment_events
          (id,event_type,order_id,email,plan,status,period_start,period_end,event_time,state_rank)
          VALUES (?, 'test', ?, 'buyer@example.com', 'monthly', ?, '2020-11-01T00:00:00Z', ?, ?, ?)
          ON CONFLICT(id) DO NOTHING''', (id, order, status, end, time, rank))

    def status(self):
        return self.db.execute('SELECT status, period_end FROM entitlements WHERE order_id="o1"').fetchone()

    def test_duplicate_and_receipt_do_not_extend_period(self):
        self.event()
        self.event(end='2100-12-01T00:00:00Z')
        self.event(id='receipt', status=None, time=3, rank=0, end=None)
        self.assertEqual(self.status(), ('active', '2099-12-01T00:00:00Z'))
        self.assertEqual(self.db.execute('SELECT count(*) FROM payment_events').fetchone()[0], 2)

    def test_canceling_retains_access_and_canceled_revokes(self):
        self.event()
        self.event(id='e2', status='canceling', time=2, rank=2)
        self.assertEqual(self.db.execute('SELECT count(*) FROM current_entitlements').fetchone()[0], 1)
        self.event(id='e3', status='canceled', time=3, rank=4)
        self.assertEqual(self.db.execute('SELECT count(*) FROM current_entitlements').fetchone()[0], 0)

    def test_past_due_then_recovery_and_refund(self):
        self.event()
        self.event(id='e2', status='past_due', time=2, rank=3)
        self.assertEqual(self.db.execute('SELECT count(*) FROM current_entitlements').fetchone()[0], 0)
        self.event(id='e3', status='active', time=3)
        self.assertEqual(self.db.execute('SELECT count(*) FROM current_entitlements').fetchone()[0], 1)
        self.event(id='e4', status='refunded', time=4, rank=5)
        self.event(id='e5', status='active', time=5)
        self.assertEqual(self.status()[0], 'refunded')

    def test_stale_or_equal_time_activation_cannot_revive_canceled(self):
        self.event(status='canceled', time=3, rank=4)
        self.event(id='e2', time=2)
        self.event(id='e3', time=3)
        self.assertEqual(self.status()[0], 'canceled')

    def test_expired_access_and_separate_orders(self):
        self.event(end='2020-12-01T00:00:00Z')
        self.event(id='other', order='o2')
        self.assertEqual(self.db.execute('SELECT count(*) FROM current_entitlements').fetchone()[0], 1)
        self.assertEqual(self.db.execute('SELECT count(*) FROM entitlements').fetchone()[0], 2)

    def test_failed_projection_rolls_back_delivery_for_retry(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute('''INSERT INTO payment_events
              (id,event_type,order_id,email,plan,status,event_time,state_rank)
              VALUES ('bad','test','o1','buyer@example.com','invalid','active',1,1)''')
        self.assertEqual(self.db.execute('SELECT count(*) FROM payment_events').fetchone()[0], 0)


if __name__ == '__main__':
    unittest.main()
