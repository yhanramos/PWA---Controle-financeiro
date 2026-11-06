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
  calculateMonthlyIndicators,
  indicatorMonthSchema,
  monthlySchemas,
} from './monthly-indicators';

export function useMonthlyIndicators(month: string) {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: ['users', user?.id, 'monthly-indicators', month],
    enabled: status === 'authenticated' && Boolean(user),
    retry: retryDataQuery,
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: async ({ signal }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      indicatorMonthSchema.parse(month);
      const { client, userId } = await userClient(user.id, signal);
      async function read<T extends { user_id: string }>(
        table: keyof typeof monthlySchemas,
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
              'Não foi possível validar os indicadores do mês.',
            );
          rows.push(...parsed.data);
          if (parsed.data.length < 100) return rows;
        }
      }
      const [transactions, invoices, installments, plans, payments] =
        await Promise.all([
          read('transactions', monthlySchemas.transactions),
          read('credit_card_invoices', monthlySchemas.credit_card_invoices),
          read('installments', monthlySchemas.installments),
          read('installment_plans', monthlySchemas.installment_plans),
          read('invoice_payments', monthlySchemas.invoice_payments),
        ]);
      signal.throwIfAborted();
      return calculateMonthlyIndicators(
        { transactions, invoices, installments, plans, payments },
        month,
      );
    },
  });
}
