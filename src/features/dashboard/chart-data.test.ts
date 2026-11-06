import { describe, expect, it } from 'vitest';
import { calculateCharts, type ChartData } from './chart-data';
const id = '00000000-0000-4000-8000-000000000001';
const empty: ChartData = {
  transactions: [],
  installments: [],
  installment_plans: [],
  invoice_payments: [],
  credit_card_invoices: [],
  categories: [{ id, user_id: id, name: 'Compras', color: '#8073f5' }],
};
const tx: ChartData['transactions'][number] = {
  id,
  user_id: id,
  category_id: id,
  amount_cents: 1001,
  kind: 'expense',
  status: 'settled',
  payment_method: 'pix',
  invoice_id: null,
  due_date: '2026-12-01',
  occurred_on: '2026-11-01',
  settled_on: '2026-11-02',
};
describe('dashboard charts', () => {
  it('separates occurrence from settlement and does not double-count invoice payments', () => {
    const result = calculateCharts(
      {
        ...empty,
        credit_card_invoices: [
          { id, user_id: id, due_date: '2026-12-20', status: 'open' },
        ],
        transactions: [
          tx,
          {
            ...tx,
            status: 'posted',
            payment_method: 'credit',
            invoice_id: id,
            settled_on: null,
          },
        ],
        invoice_payments: [
          {
            id,
            user_id: id,
            invoice_id: id,
            amount_cents: 200,
            status: 'confirmed',
            paid_on: '2026-11-02',
          },
        ],
      },
      '2026-11',
      '2026-11-02',
    );
    expect(result.total).toBe(2002);
    expect(result.evolution[5].expenses).toBe(1201);
  });
  it('excludes cancelled/reversed cash and future settlement, but includes planned competence', () => {
    const result = calculateCharts(
      {
        ...empty,
        transactions: [
          { ...tx, status: 'cancelled' },
          { ...tx, status: 'pending', settled_on: null },
          { ...tx, settled_on: '2026-11-30' },
        ],
        invoice_payments: [
          {
            id,
            user_id: id,
            invoice_id: id,
            amount_cents: 400,
            status: 'reversed',
            paid_on: '2026-11-01',
          },
        ],
      },
      '2026-11',
      '2026-11-02',
    );
    expect(result.hasCash).toBe(false);
    expect(result.total).toBe(2002);
  });
  it('preserves original installment competence after anticipation and subtracts discounts', () => {
    const data: ChartData = {
      ...empty,
      credit_card_invoices: [
        { id, user_id: id, due_date: '2026-11-20', status: 'open' },
      ],
      installment_plans: [
        { id, user_id: id, category_id: id, status: 'active' },
      ],
      installments: [
        {
          id,
          user_id: id,
          invoice_id: id,
          installment_plan_id: id,
          amount_cents: 333,
          discount_cents: 33,
          status: 'active',
          competence_month: '2026-12-01',
        },
      ],
    };
    expect(calculateCharts(data, '2026-11', '2026-11-02').total).toBe(0);
    expect(calculateCharts(data, '2026-12', '2026-11-02').total).toBe(300);
    expect(
      calculateCharts(
        {
          ...data,
          installment_plans: [
            { ...data.installment_plans[0], status: 'cancelled' },
          ],
        },
        '2026-12',
        '2026-11-02',
      ).total,
    ).toBe(0);
  });
  it('creates six ordered months across years without fake values', () => {
    const result = calculateCharts(empty, '2027-02', '2026-11-02');
    expect(result.evolution.map((r) => r.month)).toEqual([
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
    expect(result.hasCash).toBe(false);
    expect(result.expenses).toEqual([]);
  });
  it('rejects missing categories and overflowing totals', () => {
    expect(() =>
      calculateCharts(
        { ...empty, categories: [], transactions: [tx] },
        '2026-11',
        '2026-11-02',
      ),
    ).toThrow();
    expect(() =>
      calculateCharts(
        {
          ...empty,
          transactions: [tx, { ...tx, amount_cents: Number.MAX_SAFE_INTEGER }],
        },
        '2026-11',
        '2026-11-02',
      ),
    ).toThrow();
  });
});
