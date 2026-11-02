import { z } from 'zod';
import {
  calculateCashBalance,
  cashAccountSchema,
  cashPaymentSchema,
  cashTransactionSchema,
} from './cash-balance';
import {
  calculateMonthlyIndicators,
  indicatorMonthSchema,
  monthlySchemas,
} from './monthly-indicators';
import { DataError } from '@/services/data-error';

export const forecastSchemas = {
  ...monthlySchemas,
  accounts: cashAccountSchema,
  transactions: monthlySchemas.transactions.extend(cashTransactionSchema.shape),
  invoice_payments: monthlySchemas.invoice_payments.extend(
    cashPaymentSchema.shape,
  ),
};
export type ForecastData = {
  [K in keyof typeof forecastSchemas]: z.infer<(typeof forecastSchemas)[K]>[];
};
const safe = (value: bigint) => {
  if (
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    value < BigInt(Number.MIN_SAFE_INTEGER)
  )
    throw new DataError(
      'schema',
      'Projeção acima do limite de cálculo permitido.',
    );
  return Number(value);
};

export function forecastHorizon(month: string) {
  indicatorMonthSchema.parse(month);
  const [year, number] = month.split('-').map(Number);
  // Avoid Date.UTC's special treatment of years 0–99.
  const date = new Date(0);
  date.setUTCFullYear(year, number, 0);
  return date.toISOString().slice(0, 10);
}

export function calculateForecast(
  data: ForecastData,
  month: string,
  today: string,
) {
  z.iso.date().parse(today);
  const horizon = forecastHorizon(month);
  if (horizon < today) return null;
  const cash = calculateCashBalance(
    data.accounts,
    data.transactions,
    data.invoice_payments,
    today,
  );
  const monthlyData = {
    transactions: data.transactions,
    invoices: data.credit_card_invoices,
    installments: data.installments,
    plans: data.installment_plans,
    payments: data.invoice_payments,
  };
  const months = new Set(
    [
      ...data.transactions.map((t) => t.due_date.slice(0, 7)),
      ...data.credit_card_invoices.map((i) => i.due_date.slice(0, 7)),
    ].filter((m) => m <= month),
  );
  let income = 0n,
    expenses = 0n,
    invoices = 0n,
    count = 0;
  for (const dueMonth of months) {
    const totals = calculateMonthlyIndicators(monthlyData, dueMonth);
    income += BigInt(totals.income);
    expenses += BigInt(totals.expenses);
    invoices += BigInt(totals.invoiceOutstanding);
    count += totals.incomeCount + totals.expenseCount;
  }
  const overdueData = {
    ...monthlyData,
    transactions: data.transactions.filter((t) => t.due_date < today),
    invoices: data.credit_card_invoices.filter((i) => i.due_date < today),
  };
  let overdueIncome = 0n,
    overdueExpenses = 0n;
  for (const dueMonth of months) {
    const totals = calculateMonthlyIndicators(overdueData, dueMonth);
    overdueIncome += BigInt(totals.income);
    overdueExpenses +=
      BigInt(totals.expenses) + BigInt(totals.invoiceOutstanding);
  }
  return {
    today,
    horizon,
    cash: cash.balance,
    income: safe(income),
    expenses: safe(expenses),
    invoices: safe(invoices),
    projected: safe(BigInt(cash.balance) + income - expenses - invoices),
    overdueIncome: safe(overdueIncome),
    overdueExpenses: safe(overdueExpenses),
    hasPending: count > 0 || invoices > 0n,
  };
}
