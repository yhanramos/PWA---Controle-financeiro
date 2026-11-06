import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import { DataError, databaseError } from '@/services/data-error';
import type { Tables } from '@/lib/supabase/database.types';
export function useInvoices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['users', user?.id, 'invoices'],
    enabled: !!user,
    queryFn: async ({ signal }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client, userId } = await userClient(user.id, signal);
      async function read(
        table:
          | 'credit_card_invoices'
          | 'transactions'
          | 'installments'
          | 'installment_plans'
          | 'invoice_payments',
      ) {
        const rows = [];
        for (let start = 0; ; start += 100) {
          const { data, error } = await client
            .from(table)
            .select('*')
            .eq('user_id', userId)
            .order('id')
            .range(start, start + 99)
            .abortSignal(signal);
          if (error) throw databaseError(error);
          rows.push(...data);
          if (data.length < 100) return rows;
        }
      }
      const [invoices, transactions, installments, plans, payments] =
        await Promise.all([
          read('credit_card_invoices'),
          read('transactions'),
          read('installments'),
          read('installment_plans'),
          read('invoice_payments'),
        ]);
      const invoiceRows = invoices as Tables<'credit_card_invoices'>[];
      const tx = transactions as Tables<'transactions'>[];
      const parts = installments as Tables<'installments'>[];
      const activePlans = new Set(
        (plans as Tables<'installment_plans'>[])
          .filter((p) => p.status === 'active')
          .map((p) => p.id),
      );
      const paid = payments as Tables<'invoice_payments'>[];
      const safe = (value: bigint) => {
        if (
          value > BigInt(Number.MAX_SAFE_INTEGER) ||
          value < BigInt(Number.MIN_SAFE_INTEGER)
        )
          throw new DataError('schema', 'Total acima do limite permitido.');
        return Number(value);
      };
      return invoiceRows.map((invoice) => {
        const total =
          tx
            .filter((t) => t.invoice_id === invoice.id && t.status === 'posted')
            .reduce((s, t) => s + BigInt(t.amount_cents), 0n) +
          parts
            .filter(
              (p) =>
                p.invoice_id === invoice.id &&
                p.status === 'active' &&
                activePlans.has(p.installment_plan_id),
            )
            .reduce(
              (s, p) => s + BigInt(p.amount_cents) - BigInt(p.discount_cents),
              0n,
            );
        const history = paid.filter((p) => p.invoice_id === invoice.id);
        const settled = history
          .filter((p) => p.status === 'confirmed')
          .reduce((s, p) => s + BigInt(p.amount_cents), 0n);
        return {
          ...invoice,
          total: safe(total),
          paid: safe(settled),
          outstanding: safe(total - settled),
          payments: history,
        };
      });
    },
  });
}
export function useInvoiceAction() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      action:
        | {
            kind: 'pay';
            key: string;
            invoice: string;
            account: string;
            amount: number;
            date: string;
          }
        | { kind: 'reverse'; payment: string; reason: string },
    ) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client } = await userClient(user.id);
      const result =
        action.kind === 'pay'
          ? await client.rpc('pay_invoice', {
              p_key: action.key,
              p_invoice: action.invoice,
              p_account: action.account,
              p_amount: action.amount,
              p_date: action.date,
            })
          : await client.rpc('reverse_invoice_payment', {
              p_payment: action.payment,
              p_reason: action.reason,
            });
      if (result.error) throw databaseError(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', user?.id] }),
  });
}
