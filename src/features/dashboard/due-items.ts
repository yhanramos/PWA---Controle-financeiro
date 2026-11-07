import { z } from 'zod';
import {
  monthlySchemas,
  calculateMonthlyIndicators,
} from './monthly-indicators';

export const dueSchemas = {
  ...monthlySchemas,
  transactions: monthlySchemas.transactions.extend({
    description: z.string(),
    recurring_transaction_id: z.uuid().nullable(),
  }),
  credit_card_invoices: monthlySchemas.credit_card_invoices.extend({
    credit_card_id: z.uuid(),
    closing_date: z.iso.date(),
  }),
  credit_cards: z.object({ id: z.uuid(), user_id: z.uuid(), name: z.string() }),
};
export type DueData = {
  [K in keyof typeof dueSchemas]: z.infer<(typeof dueSchemas)[K]>[];
};
export type DueItem = {
  id: string;
  description: string;
  date: string;
  amount: number;
  kind: 'income' | 'expense' | 'invoice';
};

export function calculateDueItems(data: DueData, month: string) {
  const totals = calculateMonthlyIndicators(
    {
      transactions: data.transactions,
      invoices: data.credit_card_invoices,
      installments: data.installments,
      plans: data.installment_plans,
      payments: data.invoice_payments,
    },
    month,
  );
  const items: DueItem[] = data.transactions
    .filter(
      (tx) =>
        tx.status === 'pending' &&
        tx.payment_method !== 'credit' &&
        tx.invoice_id === null &&
        tx.due_date.slice(0, 7) === month,
    )
    .map((tx) => ({
      id: `transaction-${tx.id}`,
      description: tx.description,
      date: tx.due_date,
      amount: tx.amount_cents,
      kind: tx.kind,
    }));
  const balances = new Map(
    totals.invoiceBalances.map((i) => [i.id, i.outstanding]),
  );
  const cards = new Map(data.credit_cards.map((card) => [card.id, card.name]));
  for (const invoice of data.credit_card_invoices) {
    const amount = balances.get(invoice.id);
    if (amount === undefined || amount === 0) continue;
    items.push({
      id: `invoice-${invoice.id}`,
      description: `Fatura · ${cards.get(invoice.credit_card_id) ?? 'Cartão'}`,
      date: invoice.due_date,
      amount,
      kind: 'invoice',
    });
  }
  items.sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
  return { ...totals, dueItems: items };
}
