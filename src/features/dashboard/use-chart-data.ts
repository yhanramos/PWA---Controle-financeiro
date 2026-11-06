import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import {
  DataError,
  databaseError,
  retryDataQuery,
} from '@/services/data-error';
import { cashReferenceDate } from './cash-balance';
import { calculateCharts, chartSchemas } from './chart-data';

export function useChartData(month: string) {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: ['users', user?.id, 'dashboard-charts', month],
    enabled: status === 'authenticated' && Boolean(user),
    retry: retryDataQuery,
    networkMode: 'always',
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: async ({ signal }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client, userId } = await userClient(user.id, signal);
      async function read<T extends { user_id: string }>(
        table: keyof typeof chartSchemas,
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
              'Não foi possível validar os dados dos gráficos.',
            );
          rows.push(...parsed.data);
          if (parsed.data.length < 100) return rows;
        }
      }
      const [
        transactions,
        credit_card_invoices,
        installments,
        installment_plans,
        invoice_payments,
        categories,
      ] = await Promise.all([
        read('transactions', chartSchemas.transactions),
        read('credit_card_invoices', chartSchemas.credit_card_invoices),
        read('installments', chartSchemas.installments),
        read('installment_plans', chartSchemas.installment_plans),
        read('invoice_payments', chartSchemas.invoice_payments),
        read('categories', chartSchemas.categories),
      ]);
      signal.throwIfAborted();
      return calculateCharts(
        {
          transactions,
          credit_card_invoices,
          installments,
          installment_plans,
          invoice_payments,
          categories,
        },
        month,
        cashReferenceDate(),
      );
    },
  });
}
