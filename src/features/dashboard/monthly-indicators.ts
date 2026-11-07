import { z } from 'zod';
import { DataError } from '@/services/data-error';

const money = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const owned = z.object({ id: z.uuid(), user_id: z.uuid() });
export const monthlySchemas = {
  transactions: owned.extend({
    amount_cents: money,
    kind: z.enum(['income', 'expense']),
    status: z.enum(['pending', 'settled', 'posted', 'cancelled']),
    payment_method: z.string(),
    due_date: z.iso.date(),
    invoice_id: z.uuid().nullable(),
  }),
  credit_card_invoices: owned.extend({
    due_date: z.iso.date(),
    status: z.enum(['open', 'closed', 'cancelled']),
  }),
  installments: owned.extend({
    invoice_id: z.uuid(),
    installment_plan_id: z.uuid(),
    amount_cents: money,
    discount_cents: money,
    status: z.enum(['active', 'cancelled']),
  }),
  installment_plans: owned.extend({ status: z.enum(['active', 'cancelled']) }),
  invoice_payments: owned.extend({
    invoice_id: z.uuid(),
    amount_cents: money,
    status: z.enum(['confirmed', 'reversed']),
  }),
};
export const monthlyDataSchema = z.object({
  transactions: z.array(monthlySchemas.transactions),
  invoices: z.array(monthlySchemas.credit_card_invoices),
  installments: z.array(monthlySchemas.installments),
  plans: z.array(monthlySchemas.installment_plans),
  payments: z.array(monthlySchemas.invoice_payments),
});
export type MonthlyData = z.infer<typeof monthlyDataSchema>;
export const indicatorMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

function safe(value: bigint) {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new DataError(
      'schema',
      'Os totais do mês estão inconsistentes ou acima do limite permitido.',
    );
  return Number(value);
}

export function calculateMonthlyIndicators(
  input: MonthlyData,
  month: string,
  invoiceIds?: ReadonlySet<string>,
) {
  indicatorMonthSchema.parse(month);
  const data = monthlyDataSchema.parse(input);
  const inMonth = (date: string) => date.slice(0, 7) === month;
  let income = 0n,
    expenses = 0n,
    incomeCount = 0,
    expenseCount = 0;
  const invoices = new Map(
    data.invoices
      .filter(
        (i) =>
          i.status !== 'cancelled' &&
          (invoiceIds ? invoiceIds.has(i.id) : inMonth(i.due_date)),
      )
      .map((i) => [i.id, { total: 0n, paid: 0n }]),
  );
  for (const tx of data.transactions) {
    if (
      tx.status === 'pending' &&
      tx.payment_method !== 'credit' &&
      tx.invoice_id === null &&
      inMonth(tx.due_date)
    ) {
      if (tx.kind === 'income') {
        income += BigInt(tx.amount_cents);
        incomeCount++;
      } else {
        expenses += BigInt(tx.amount_cents);
        expenseCount++;
      }
    }
    const invoice = tx.invoice_id ? invoices.get(tx.invoice_id) : undefined;
    if (
      invoice &&
      tx.status === 'posted' &&
      tx.kind === 'expense' &&
      tx.payment_method === 'credit'
    )
      invoice.total += BigInt(tx.amount_cents);
  }
  const activePlans = new Set(
    data.plans.filter((p) => p.status === 'active').map((p) => p.id),
  );
  for (const part of data.installments) {
    const invoice = invoices.get(part.invoice_id);
    if (
      !invoice ||
      part.status !== 'active' ||
      !activePlans.has(part.installment_plan_id)
    )
      continue;
    if (part.discount_cents > part.amount_cents)
      throw new DataError('schema', 'Desconto de parcela inválido.');
    invoice.total += BigInt(part.amount_cents) - BigInt(part.discount_cents);
  }
  for (const payment of data.payments) {
    const invoice = invoices.get(payment.invoice_id);
    if (invoice && payment.status === 'confirmed')
      invoice.paid += BigInt(payment.amount_cents);
  }
  let invoiceTotal = 0n,
    invoiceOutstanding = 0n;
  for (const invoice of invoices.values()) {
    safe(invoice.total - invoice.paid);
    invoiceTotal += invoice.total;
    invoiceOutstanding += invoice.total - invoice.paid;
  }
  return {
    income: safe(income),
    expenses: safe(expenses),
    invoiceTotal: safe(invoiceTotal),
    invoiceOutstanding: safe(invoiceOutstanding),
    incomeCount,
    expenseCount,
    invoiceCount: invoices.size,
    invoiceBalances: [...invoices].map(([id, invoice]) => ({
      id,
      outstanding: safe(invoice.total - invoice.paid),
    })),
  };
}
