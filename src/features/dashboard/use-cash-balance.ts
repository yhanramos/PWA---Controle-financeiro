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
  calculateCashBalance,
  cashAccountSchema,
  cashPaymentSchema,
  cashReferenceDate,
  cashTransactionSchema,
} from './cash-balance';

export function useCashBalance() {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: ['users', user?.id, 'cash-balance'],
    enabled: status === 'authenticated' && Boolean(user),
    retry: retryDataQuery,
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: async ({ signal }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const referenceDate = cashReferenceDate();
      const { client, userId } = await userClient(user.id, signal);
      async function read<T extends { user_id: string }>(
        table: 'accounts' | 'transactions' | 'invoice_payments',
        columns: string,
        schema: z.ZodType<T>,
      ) {
        const rows: T[] = [];
        for (let start = 0; ; start += 100) {
          const { data, error } = await client
            .from(table)
            .select(columns)
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
              'Não foi possível validar os dados do saldo.',
            );
          rows.push(...parsed.data);
          if (parsed.data.length < 100) return rows;
        }
      }
      const [accounts, transactions, payments] = await Promise.all([
        read(
          'accounts',
          'id,user_id,opening_balance_cents,opening_balance_date',
          cashAccountSchema,
        ),
        read(
          'transactions',
          'user_id,account_id,amount_cents,kind,status,payment_method,settled_on',
          cashTransactionSchema,
        ),
        read(
          'invoice_payments',
          'user_id,account_id,amount_cents,status,paid_on',
          cashPaymentSchema,
        ),
      ]);
      signal.throwIfAborted();
      return calculateCashBalance(
        accounts,
        transactions,
        payments,
        referenceDate,
      );
    },
  });
}
