import { z } from 'zod';
import { monthlySchemas, indicatorMonthSchema } from './monthly-indicators';
import { shiftMonth } from '@/lib/utils/calendar';
import { DataError } from '@/services/data-error';

export const chartSchemas = {
  ...monthlySchemas,
  transactions: monthlySchemas.transactions.extend({
    category_id: z.uuid(),
    occurred_on: z.iso.date(),
    settled_on: z.iso.date().nullable(),
  }),
  installments: monthlySchemas.installments.extend({
    competence_month: z.iso.date(),
  }),
  installment_plans: monthlySchemas.installment_plans.extend({
    category_id: z.uuid(),
  }),
  invoice_payments: monthlySchemas.invoice_payments.extend({
    paid_on: z.iso.date(),
  }),
  categories: z.object({
    id: z.uuid(),
    user_id: z.uuid(),
    name: z.string().min(1),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
  }),
};
export type ChartData = {
  [K in keyof typeof chartSchemas]: z.infer<(typeof chartSchemas)[K]>[];
};
function safe(value: bigint) {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new DataError('schema', 'Valor do gráfico fora do limite permitido.');
  return Number(value);
}
export function calculateCharts(data: ChartData, month: string, today: string) {
  indicatorMonthSchema.parse(month);
  z.iso.date().parse(today);
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const cash = new Map(
    months.map((key) => [key, { income: 0n, expenses: 0n }]),
  );
  const categories = new Map(
    data.categories.map((c) => [c.id, { ...c, total: 0n }]),
  );
  const invoices = new Set(
    data.credit_card_invoices
      .filter((i) => i.status !== 'cancelled')
      .map((i) => i.id),
  );
  const addExpense = (categoryId: string, amount: bigint) => {
    const category = categories.get(categoryId);
    if (!category)
      throw new DataError('schema', 'Categoria da despesa não encontrada.');
    safe(amount);
    category.total += amount;
  };
  for (const tx of data.transactions) {
    if (tx.status === 'settled' && tx.payment_method !== 'credit') {
      if (!tx.settled_on)
        throw new DataError('schema', 'Liquidação sem data efetiva.');
      const bucket = cash.get(tx.settled_on.slice(0, 7));
      if (bucket && tx.settled_on <= today)
        bucket[tx.kind === 'income' ? 'income' : 'expenses'] += BigInt(
          tx.amount_cents,
        );
    }
    if (
      tx.kind === 'expense' &&
      tx.status !== 'cancelled' &&
      tx.occurred_on.slice(0, 7) === month &&
      (tx.payment_method !== 'credit' ||
        (tx.status === 'posted' &&
          tx.invoice_id &&
          invoices.has(tx.invoice_id)))
    )
      addExpense(tx.category_id, BigInt(tx.amount_cents));
  }
  for (const payment of data.invoice_payments) {
    const bucket = cash.get(payment.paid_on.slice(0, 7));
    if (bucket && payment.status === 'confirmed' && payment.paid_on <= today)
      bucket.expenses += BigInt(payment.amount_cents);
  }
  const plans = new Map(
    data.installment_plans
      .filter((p) => p.status === 'active')
      .map((p) => [p.id, p]),
  );
  for (const part of data.installments) {
    const plan = plans.get(part.installment_plan_id);
    if (
      plan &&
      part.status === 'active' &&
      invoices.has(part.invoice_id) &&
      part.competence_month.slice(0, 7) === month
    )
      addExpense(
        plan.category_id,
        BigInt(part.amount_cents) - BigInt(part.discount_cents),
      );
  }
  const evolution = months.map((key) => {
    const bucket = cash.get(key);
    return {
      month: key,
      income: safe(bucket?.income ?? 0n),
      expenses: safe(bucket?.expenses ?? 0n),
    };
  });
  const expenses = [...categories.values()]
    .filter((c) => c.total > 0n)
    .map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      amount: safe(c.total),
    }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  return {
    evolution,
    expenses,
    total: safe(expenses.reduce((sum, c) => sum + BigInt(c.amount), 0n)),
    hasCash: evolution.some((row) => row.income > 0 || row.expenses > 0),
  };
}
