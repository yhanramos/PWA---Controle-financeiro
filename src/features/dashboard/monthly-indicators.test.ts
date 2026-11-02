import { describe, expect, it } from 'vitest';
import {
  calculateMonthlyIndicators,
  type MonthlyData,
} from './monthly-indicators';

const id = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const empty: MonthlyData = {
  transactions: [],
  invoices: [],
  installments: [],
  plans: [],
  payments: [],
};
const tx: MonthlyData['transactions'][number] = {
  id,
  user_id: id,
  amount_cents: 101,
  kind: 'income',
  status: 'pending',
  payment_method: 'pix',
  due_date: '2026-11-30',
  invoice_id: null,
};
const invoice: MonthlyData['invoices'][number] = {
  id,
  user_id: id,
  due_date: '2026-11-20',
  status: 'open',
};
const part: MonthlyData['installments'][number] = {
  id,
  user_id: id,
  invoice_id: id,
  installment_plan_id: id,
  status: 'active',
  amount_cents: 334,
  discount_cents: 34,
};
const payment: MonthlyData['payments'][number] = {
  id,
  user_id: id,
  invoice_id: id,
  amount_cents: 100,
  status: 'confirmed',
};

describe('monthly indicators', () => {
  it('counts only pending noncredit entries due in the selected month', () => {
    const result = calculateMonthlyIndicators(
      {
        ...empty,
        transactions: [
          tx,
          { ...tx, kind: 'expense', amount_cents: 202 },
          { ...tx, status: 'settled' },
          { ...tx, status: 'cancelled' },
          { ...tx, due_date: '2026-12-01' },
        ],
      },
      '2026-11',
    );
    expect(result).toMatchObject({
      income: 101,
      expenses: 202,
      incomeCount: 1,
      expenseCount: 1,
    });
  });
  it('keeps total invoices separate from payments and ignores reversals and cancelled plans', () => {
    const result = calculateMonthlyIndicators(
      {
        ...empty,
        invoices: [invoice],
        transactions: [
          {
            ...tx,
            kind: 'expense',
            status: 'posted',
            payment_method: 'credit',
            invoice_id: id,
            due_date: '2026-10-01',
          },
        ],
        plans: [
          { id, user_id: id, status: 'active' },
          { id: other, user_id: id, status: 'cancelled' },
        ],
        installments: [
          part,
          { ...part, id: other, installment_plan_id: other },
          { ...part, status: 'cancelled' },
        ],
        payments: [payment, { ...payment, status: 'reversed' }],
      },
      '2026-11',
    );
    expect(result).toMatchObject({
      income: 0,
      expenses: 0,
      invoiceTotal: 401,
      invoiceOutstanding: 301,
    });
  });
  it('follows the destination invoice month for moved installments', () => {
    const data: MonthlyData = {
      ...empty,
      invoices: [invoice, { ...invoice, id: other, due_date: '2026-12-20' }],
      plans: [{ id, user_id: id, status: 'active' }],
      installments: [part],
    };
    expect(calculateMonthlyIndicators(data, '2026-11').invoiceTotal).toBe(300);
    expect(calculateMonthlyIndicators(data, '2026-12').invoiceTotal).toBe(0);
  });
  it('includes paid invoices in totals and excludes cancelled invoices', () => {
    const data: MonthlyData = {
      ...empty,
      invoices: [{ ...invoice, status: 'closed' }],
      plans: [{ id, user_id: id, status: 'active' }],
      installments: [part],
      payments: [{ ...payment, amount_cents: 300 }],
    };
    expect(calculateMonthlyIndicators(data, '2026-11')).toMatchObject({
      invoiceTotal: 300,
      invoiceOutstanding: 0,
    });
    expect(
      calculateMonthlyIndicators(
        { ...data, invoices: [{ ...invoice, status: 'cancelled' }] },
        '2026-11',
      ).invoiceTotal,
    ).toBe(0);
  });
  it('returns real zero for empty months and rejects invalid or unsafe totals', () => {
    expect(calculateMonthlyIndicators(empty, '2027-01')).toMatchObject({
      income: 0,
      expenses: 0,
      invoiceTotal: 0,
      invoiceCount: 0,
    });
    expect(() => calculateMonthlyIndicators(empty, '2026-13')).toThrow();
    expect(() =>
      calculateMonthlyIndicators(
        {
          ...empty,
          transactions: [tx, { ...tx, amount_cents: Number.MAX_SAFE_INTEGER }],
        },
        '2026-11',
      ),
    ).toThrow();
    expect(() =>
      calculateMonthlyIndicators(
        { ...empty, invoices: [invoice], payments: [payment] },
        '2026-11',
      ),
    ).toThrow();
  });
});
