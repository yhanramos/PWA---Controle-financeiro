import { describe, expect, it } from 'vitest';
import {
  calculateForecast,
  forecastHorizon,
  type ForecastData,
} from './forecast';
const id = '00000000-0000-4000-8000-000000000001';
const account = {
  id,
  user_id: id,
  opening_balance_cents: 10000,
  opening_balance_date: '2026-01-01',
};
const empty: ForecastData = {
  accounts: [account],
  transactions: [],
  credit_card_invoices: [],
  installments: [],
  installment_plans: [],
  invoice_payments: [],
};
const tx: ForecastData['transactions'][number] = {
  id,
  user_id: id,
  account_id: id,
  amount_cents: 1000,
  kind: 'income',
  status: 'pending',
  payment_method: 'pix',
  settled_on: null,
  due_date: '2026-11-20',
  invoice_id: null,
};
const invoice = {
  id,
  user_id: id,
  due_date: '2026-11-20',
  status: 'open' as const,
};
const payment: ForecastData['invoice_payments'][number] = {
  id,
  user_id: id,
  account_id: id,
  invoice_id: id,
  amount_cents: 400,
  status: 'confirmed',
  paid_on: '2026-11-01',
};
describe('cash forecast', () => {
  it('includes overdue obligations and intermediate months, excluding beyond horizon', () => {
    const data: ForecastData = {
      ...empty,
      transactions: [
        tx,
        { ...tx, kind: 'expense', due_date: '2026-10-01' },
        { ...tx, amount_cents: 500, due_date: '2026-12-01' },
        { ...tx, amount_cents: 9999, due_date: '2027-01-01' },
      ],
    };
    expect(calculateForecast(data, '2026-11', '2026-11-02')).toMatchObject({
      projected: 10000,
      overdueExpenses: 1000,
    });
    expect(calculateForecast(data, '2026-12', '2026-11-02')?.projected).toBe(
      10500,
    );
  });
  it('deducts only outstanding invoice amount after partial payment; reversal restores both sides', () => {
    const data: ForecastData = {
      ...empty,
      transactions: [
        {
          ...tx,
          kind: 'expense',
          status: 'posted',
          payment_method: 'credit',
          account_id: null,
          invoice_id: id,
        },
      ],
      credit_card_invoices: [invoice],
      invoice_payments: [payment],
    };
    expect(calculateForecast(data, '2026-11', '2026-11-02')).toMatchObject({
      cash: 9600,
      invoices: 600,
      projected: 9000,
    });
    expect(
      calculateForecast(
        { ...data, invoice_payments: [{ ...payment, status: 'reversed' }] },
        '2026-11',
        '2026-11-02',
      ),
    ).toMatchObject({ cash: 10000, invoices: 1000, projected: 9000 });
  });
  it('counts a settled receipt once and ignores cancellations', () => {
    expect(
      calculateForecast(
        {
          ...empty,
          transactions: [
            { ...tx, status: 'settled', settled_on: '2026-11-01' },
            { ...tx, status: 'cancelled' },
          ],
        },
        '2026-11',
        '2026-11-02',
      ),
    ).toMatchObject({ projected: 11000, income: 0, hasPending: false });
  });
  it('uses invoice destination and installment discounts, not original purchase total', () => {
    const data: ForecastData = {
      ...empty,
      credit_card_invoices: [invoice],
      installment_plans: [{ id, user_id: id, status: 'active' }],
      installments: [
        {
          id,
          user_id: id,
          invoice_id: id,
          installment_plan_id: id,
          amount_cents: 333,
          discount_cents: 33,
          status: 'active',
        },
      ],
    };
    expect(calculateForecast(data, '2026-11', '2026-11-02')?.projected).toBe(
      9700,
    );
  });
  it('handles past months, leap years, empty obligations and negative projections', () => {
    expect(forecastHorizon('2028-02')).toBe('2028-02-29');
    expect(calculateForecast(empty, '2026-10', '2026-11-02')).toBeNull();
    expect(calculateForecast(empty, '2026-11', '2026-11-02')).toMatchObject({
      projected: 10000,
      hasPending: false,
    });
    expect(
      calculateForecast(
        {
          ...empty,
          transactions: [{ ...tx, kind: 'expense', amount_cents: 12000 }],
        },
        '2026-11',
        '2026-11-02',
      )?.projected,
    ).toBe(-2000);
  });
  it('rejects overflow instead of rounding the forecast', () => {
    expect(() =>
      calculateForecast(
        {
          ...empty,
          accounts: [
            { ...account, opening_balance_cents: Number.MAX_SAFE_INTEGER },
          ],
          transactions: [tx],
        },
        '2026-11',
        '2026-11-02',
      ),
    ).toThrow();
  });
});
