import { describe, expect, it } from 'vitest';
import { calculateDueItems, type DueData } from './due-items';

const id = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const empty: DueData = {
  transactions: [],
  credit_card_invoices: [],
  installments: [],
  installment_plans: [],
  invoice_payments: [],
  credit_cards: [],
};
const transaction: DueData['transactions'][number] = {
  id,
  user_id: id,
  description: 'Receita',
  kind: 'income',
  status: 'pending',
  payment_method: 'pix',
  invoice_id: null,
  recurring_transaction_id: null,
  amount_cents: 100,
  due_date: '2026-11-01',
};
const credit: DueData = {
  ...empty,
  credit_cards: [{ id, user_id: id, name: 'Cartão pessoal' }],
  credit_card_invoices: [
    {
      id,
      user_id: id,
      credit_card_id: id,
      due_date: '2026-11-20',
      closing_date: '2026-11-10',
      status: 'closed',
    },
  ],
  transactions: [
    {
      ...transaction,
      kind: 'expense',
      status: 'posted',
      payment_method: 'credit',
      invoice_id: id,
    },
  ],
  installment_plans: [{ id, user_id: id, status: 'active' }],
  installments: [
    {
      id,
      user_id: id,
      invoice_id: id,
      installment_plan_id: id,
      amount_cents: 334,
      discount_cents: 34,
      status: 'active',
    },
  ],
  invoice_payments: [
    { id, user_id: id, invoice_id: id, amount_cents: 150, status: 'confirmed' },
  ],
};

describe('dashboard due items', () => {
  it('keeps overdue entries in their due month and excludes settled, cancelled and other months', () => {
    const result = calculateDueItems(
      {
        ...empty,
        transactions: [
          transaction,
          {
            ...transaction,
            id: other,
            kind: 'expense',
            due_date: '2026-11-30',
          },
          { ...transaction, status: 'settled' },
          { ...transaction, status: 'cancelled' },
          { ...transaction, due_date: '2026-12-01' },
        ],
      },
      '2026-11',
    );
    expect(result.dueItems.map((item) => item.date)).toEqual([
      '2026-11-01',
      '2026-11-30',
    ]);
    expect(result.income).toBe(100);
    expect(result.expenses).toBe(100);
  });
  it('groups purchases and discounted installments into the outstanding invoice only', () => {
    const result = calculateDueItems(credit, '2026-11');
    expect(result.dueItems).toEqual([
      {
        id: `invoice-${id}`,
        description: 'Fatura · Cartão pessoal',
        date: '2026-11-20',
        amount: 250,
        kind: 'invoice',
      },
    ]);
    expect(result.invoiceOutstanding).toBe(250);
    expect(calculateDueItems(credit, '2026-12').dueItems).toEqual([]);
  });
  it('restores reversed payments and hides fully paid or cancelled invoices', () => {
    expect(
      calculateDueItems(
        {
          ...credit,
          invoice_payments: credit.invoice_payments.map((p) => ({
            ...p,
            status: 'reversed',
          })),
        },
        '2026-11',
      ).dueItems[0]?.amount,
    ).toBe(400);
    expect(
      calculateDueItems(
        {
          ...credit,
          invoice_payments: credit.invoice_payments.map((p) => ({
            ...p,
            amount_cents: 400,
          })),
        },
        '2026-11',
      ).dueItems,
    ).toEqual([]);
    expect(
      calculateDueItems(
        {
          ...credit,
          credit_card_invoices: credit.credit_card_invoices.map((i) => ({
            ...i,
            status: 'cancelled',
          })),
        },
        '2026-11',
      ).dueItems,
    ).toEqual([]);
  });
  it('returns an empty list for no records and rejects overpayments', () => {
    expect(calculateDueItems(empty, '2027-01').dueItems).toEqual([]);
    expect(() =>
      calculateDueItems(
        {
          ...credit,
          invoice_payments: credit.invoice_payments.map((p) => ({
            ...p,
            amount_cents: 401,
          })),
        },
        '2026-11',
      ),
    ).toThrow();
  });
});
