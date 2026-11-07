import { describe, expect, it } from 'vitest';
import { calculateCurrentInvoices } from './current-invoices';
import { calculateDueItems, type DueData } from './due-items';

const id = '00000000-0000-4000-8000-000000000001';
const next = '00000000-0000-4000-8000-000000000002';
const data: DueData = {
  credit_cards: [{ id, user_id: id, name: 'Inter' }],
  credit_card_invoices: [
    {
      id,
      user_id: id,
      credit_card_id: id,
      closing_date: '2026-12-01',
      due_date: '2026-12-07',
      status: 'open',
    },
    {
      id: next,
      user_id: id,
      credit_card_id: id,
      closing_date: '2027-01-01',
      due_date: '2027-01-07',
      status: 'open',
    },
  ],
  transactions: [
    {
      id,
      user_id: id,
      description: 'Compra',
      recurring_transaction_id: null,
      amount_cents: 2000,
      kind: 'expense',
      status: 'posted',
      payment_method: 'credit',
      invoice_id: id,
      due_date: '2026-12-07',
    },
  ],
  installment_plans: [{ id, user_id: id, status: 'active' }],
  installments: [
    {
      id,
      user_id: id,
      invoice_id: id,
      installment_plan_id: id,
      amount_cents: 10500,
      discount_cents: 500,
      status: 'active',
    },
    {
      id: next,
      user_id: id,
      invoice_id: next,
      installment_plan_id: id,
      amount_cents: 10500,
      discount_cents: 0,
      status: 'active',
    },
  ],
  invoice_payments: [
    {
      id,
      user_id: id,
      invoice_id: id,
      amount_cents: 1000,
      status: 'confirmed',
    },
  ],
};

describe('current invoice cycle', () => {
  it('includes December Inter purchases and installments in November without including January', () => {
    const result = calculateCurrentInvoices(data, '2026-11-06');
    expect(result).toMatchObject({
      total: 12000,
      outstanding: 11000,
      count: 1,
    });
    expect(result.invoices[0]?.due).toBe('2026-12-07');
    // Due-date views retain the actual payment month.
    expect(calculateDueItems(data, '2026-11').invoiceTotal).toBe(0);
    expect(calculateDueItems(data, '2026-12').invoiceTotal).toBe(12000);
  });
  it('switches cycles on closing day', () => {
    expect(calculateCurrentInvoices(data, '2026-12-01')).toMatchObject({
      total: 10500,
      count: 1,
    });
  });
  it('excludes cancelled invoices and restores reversed payments', () => {
    expect(
      calculateCurrentInvoices(
        {
          ...data,
          credit_card_invoices: data.credit_card_invoices.map((i) => ({
            ...i,
            status: 'cancelled',
          })),
        },
        '2026-11-06',
      ).total,
    ).toBe(0);
    expect(
      calculateCurrentInvoices(
        {
          ...data,
          invoice_payments: data.invoice_payments.map((p) => ({
            ...p,
            status: 'reversed',
          })),
        },
        '2026-11-06',
      ).outstanding,
    ).toBe(12000);
  });
  it('does not bring distant cycles into the current month', () => {
    expect(calculateCurrentInvoices(data, '2026-09-06').count).toBe(0);
  });
  it('handles February when the next closing is at the end of March', () => {
    const invoice = data.credit_card_invoices[0];
    if (!invoice) throw new Error('Missing invoice fixture');
    const source = {
      ...data,
      credit_card_invoices: [
        {
          ...invoice,
          closing_date: '2028-03-31',
          due_date: '2028-04-07',
        },
      ],
    };
    expect(calculateCurrentInvoices(source, '2028-02-29').count).toBe(1);
    expect(calculateCurrentInvoices(source, '2028-02-28').count).toBe(0);
  });
});
