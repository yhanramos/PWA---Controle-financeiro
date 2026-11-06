import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import {
  DataError,
  databaseError,
  retryDataQuery,
} from '@/services/data-error';
import {
  calculateForecast,
  forecastHorizon,
  forecastSchemas,
} from './forecast';
import { cashReferenceDate } from './cash-balance';

export function useForecast(month: string) {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: ['users', user?.id, 'forecast', month],
    enabled: status === 'authenticated' && Boolean(user),
    retry: retryDataQuery,
    networkMode: 'always',
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: async ({ signal }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const today = cashReferenceDate();
      if (forecastHorizon(month) < today) return null;
      const { client, userId } = await userClient(user.id, signal);
      async function read<T extends { user_id: string }>(
        table: keyof typeof forecastSchemas,
        schema: z.ZodType<T>,
      ) {
        const rows: T[] = [];
        for (let start = 0; ; start += 100) {
          const { data, error } = await client
            .from(table)
            .select('*')
            .eq('user_id', userId)
            .order('id')
            .range(start, start + 99)
            .abortSignal(signal);
          if (error) throw databaseError(error);
          const parsed = z.array(schema).safeParse(data);
          if (
            !parsed.success ||
            parsed.data.some((row) => row.user_id !== userId)
          )
            throw new DataError(
              'schema',
              'Não foi possível validar os dados da projeção.',
            );
          rows.push(...parsed.data);
          if (parsed.data.length < 100) return rows;
        }
      }
      const [accounts, transactions, invoices, installments, plans, payments] =
        await Promise.all([
          read('accounts', forecastSchemas.accounts),
          read('transactions', forecastSchemas.transactions),
          read('credit_card_invoices', forecastSchemas.credit_card_invoices),
          read('installments', forecastSchemas.installments),
          read('installment_plans', forecastSchemas.installment_plans),
          read('invoice_payments', forecastSchemas.invoice_payments),
        ]);
      signal.throwIfAborted();
      return calculateForecast(
        {
          accounts,
          transactions,
          credit_card_invoices: invoices,
          installments,
          installment_plans: plans,
          invoice_payments: payments,
        },
        month,
        today,
      );
    },
  });
}
