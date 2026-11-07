import { z } from 'zod';
import type { DueData } from './due-items';
import { calculateMonthlyIndicators } from './monthly-indicators';

export function calculateCurrentInvoices(data: DueData, today: string) {
  z.iso.date().parse(today);
  const invoices = data.credit_card_invoices.filter((invoice) => {
    if (invoice.status === 'cancelled' || invoice.closing_date <= today)
      return false;
    const [year, month, day] = invoice.closing_date.split('-').map(Number);
    const end = new Date(0);
    end.setUTCFullYear(year, month - 1, 0);
    const previous = new Date(0);
    previous.setUTCFullYear(year, month - 2, Math.min(day, end.getUTCDate()));
    const fallback = previous.toISOString().slice(0, 10);
    const prior = data.credit_card_invoices.find(
      (other) =>
        other.credit_card_id === invoice.credit_card_id &&
        other.status !== 'cancelled' &&
        other.closing_date.slice(0, 7) === fallback.slice(0, 7),
    );
    return (prior?.closing_date ?? fallback) <= today;
  });
  const totals = calculateMonthlyIndicators(
    {
      transactions: data.transactions,
      invoices: data.credit_card_invoices,
      installments: data.installments,
      plans: data.installment_plans,
      payments: data.invoice_payments,
    },
    today.slice(0, 7),
    new Set(invoices.map((invoice) => invoice.id)),
  );
  return {
    total: totals.invoiceTotal,
    outstanding: totals.invoiceOutstanding,
    count: totals.invoiceCount,
    invoices: invoices
      .map((invoice) => ({
        id: invoice.id,
        name:
          data.credit_cards.find((card) => card.id === invoice.credit_card_id)
            ?.name ?? 'Cartão',
        closing: invoice.closing_date,
        due: invoice.due_date,
      }))
      .sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id)),
  };
}
