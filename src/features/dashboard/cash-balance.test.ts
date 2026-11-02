import { describe, expect, it } from 'vitest';
import { calculateCashBalance, cashReferenceDate } from './cash-balance';

const user_id = '00000000-0000-4000-8000-000000000001';
const account = {
  id: user_id,
  user_id,
  opening_balance_cents: 10000,
  opening_balance_date: '2026-11-01',
};
const tx = {
  user_id,
  account_id: user_id,
  amount_cents: 1001,
  kind: 'income' as const,
  status: 'settled' as const,
  payment_method: 'pix',
  settled_on: '2026-11-02',
};
const payment = {
  user_id,
  account_id: user_id,
  amount_cents: 400,
  status: 'confirmed' as const,
  paid_on: '2026-11-02',
};

describe('current cash balance', () => {
  it('counts settled cash and invoice payments without counting credit purchases twice', () => {
    const result = calculateCashBalance(
      [account],
      [
        tx,
        { ...tx, kind: 'expense', amount_cents: 201 },
        {
          ...tx,
          kind: 'expense',
          payment_method: 'credit',
          status: 'posted',
          settled_on: null,
        },
        { ...tx, status: 'pending', settled_on: null },
        { ...tx, status: 'cancelled', settled_on: null },
      ],
      [payment, { ...payment, status: 'reversed' }],
      '2026-11-02',
    );
    expect(result.balance).toBe(10400);
    expect(result.invoicePayments).toBe(400);
  });

  it('excludes future opening balances and future settlement dates', () => {
    expect(
      calculateCashBalance(
        [
          account,
          { ...account, id: 'future', opening_balance_date: '2026-12-01' },
        ],
        [{ ...tx, settled_on: '2026-11-03' }],
        [{ ...payment, paid_on: '2026-11-03' }],
        '2026-11-02',
      ).balance,
    ).toBe(10000);
  });

  it('restores cash after payment reversal and supports negative cash', () => {
    const accounts = [{ ...account, opening_balance_cents: -100 }];
    expect(
      calculateCashBalance(accounts, [], [payment], '2026-11-02').balance,
    ).toBe(-500);
    expect(
      calculateCashBalance(
        accounts,
        [],
        [{ ...payment, status: 'reversed' }],
        '2026-11-02',
      ).balance,
    ).toBe(-100);
  });

  it('distinguishes no accounts from an account with zero cash', () => {
    expect(calculateCashBalance([], [], [], '2026-11-02').accountCount).toBe(0);
    expect(
      calculateCashBalance(
        [{ ...account, opening_balance_cents: 0 }],
        [],
        [],
        '2026-11-02',
      ),
    ).toMatchObject({ accountCount: 1, balance: 0 });
  });

  it('fails closed on missing accounts, missing settlement dates and unsafe totals', () => {
    expect(() => calculateCashBalance([], [tx], [], '2026-11-02')).toThrow();
    expect(() =>
      calculateCashBalance(
        [account],
        [{ ...tx, settled_on: null }],
        [],
        '2026-11-02',
      ),
    ).toThrow();
    expect(() =>
      calculateCashBalance(
        [{ ...account, opening_balance_cents: Number.MAX_SAFE_INTEGER }],
        [tx],
        [],
        '2026-11-02',
      ),
    ).toThrow();
  });

  it('uses the calendar date in Sao Paulo at the UTC day boundary', () => {
    expect(cashReferenceDate(new Date('2026-11-02T01:00:00Z'))).toBe(
      '2026-11-01',
    );
  });
});
