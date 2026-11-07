import { z } from 'zod';
import { indicatorMonthSchema, monthlySchemas } from './monthly-indicators';
import { DataError } from '@/services/data-error';

const expenseSchema = monthlySchemas.transactions.extend({
  recurring_transaction_id: z.uuid().nullable().optional(),
});

export function calculateMonthlyExpenses(
  input: z.infer<typeof expenseSchema>[],
  month: string,
  invoiceTotal: number,
  today?: string,
) {
  indicatorMonthSchema.parse(month);
  const transactions = z
    .array(expenseSchema)
    .parse(input)
    .filter(
      (tx) =>
        tx.kind === 'expense' &&
        (tx.status === 'pending' || tx.status === 'settled') &&
        tx.payment_method !== 'credit' &&
        tx.invoice_id === null,
    );
  if (today) z.iso.date().parse(today);
  z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).parse(invoiceTotal);
  let outsideCredit = 0n;
  let pendingOutsideCredit = 0n;
  let upcomingRecurring = 0n;
  const represented = new Set(
    transactions
      .filter((tx) => tx.due_date.slice(0, 7) === month)
      .map((tx) => tx.recurring_transaction_id)
      .filter(Boolean),
  );
  const nextByRule = new Map<string, z.infer<typeof expenseSchema>>();
  if (today?.slice(0, 7) === month) {
    for (const tx of transactions) {
      const rule = tx.recurring_transaction_id;
      if (!rule || represented.has(rule) || tx.due_date.slice(0, 7) <= month)
        continue;
      const prior = nextByRule.get(rule);
      if (
        !prior ||
        tx.due_date < prior.due_date ||
        (tx.due_date === prior.due_date && tx.id < prior.id)
      )
        nextByRule.set(rule, tx);
    }
  }
  for (const tx of transactions) {
    if (
      tx.kind === 'expense' &&
      (tx.status === 'pending' || tx.status === 'settled') &&
      tx.payment_method !== 'credit' &&
      tx.invoice_id === null &&
      tx.due_date.slice(0, 7) === month
    ) {
      outsideCredit += BigInt(tx.amount_cents);
      if (tx.status === 'pending')
        pendingOutsideCredit += BigInt(tx.amount_cents);
    }
  }
  for (const tx of nextByRule.values()) {
    upcomingRecurring += BigInt(tx.amount_cents);
    if (tx.status === 'pending')
      pendingOutsideCredit += BigInt(tx.amount_cents);
  }
  outsideCredit += upcomingRecurring;
  const total = outsideCredit + BigInt(invoiceTotal);
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new DataError(
      'schema',
      'As despesas ultrapassam o limite de cálculo permitido.',
    );
  return {
    total: Number(total),
    outsideCredit: Number(outsideCredit),
    invoices: invoiceTotal,
    upcomingRecurring: Number(upcomingRecurring),
    pendingOutsideCredit: Number(pendingOutsideCredit),
  };
}
