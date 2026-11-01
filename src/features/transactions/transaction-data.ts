import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import { positiveMoneyInput } from '@/lib/financial-money';
import {
  DataError,
  databaseError,
  retryDataQuery,
} from '@/services/data-error';
import type { Tables } from '@/lib/supabase/database.types';
export const transactionInput = z
  .object({
    description: z.string().trim().min(1).max(200),
    kind: z.enum(['income', 'expense']),
    amount_cents: positiveMoneyInput,
    category_id: z.uuid(),
    account_id: z.uuid(),
    occurred_on: z.iso.date(),
    due_date: z.iso.date(),
    payment_method: z.enum(['cash', 'pix', 'debit', 'bank_transfer']),
    status: z.enum(['pending', 'settled']),
    settled_on: z
      .union([z.literal(''), z.iso.date()])
      .transform((v) => v || null),
  })
  .refine(
    (v) =>
      v.status === 'settled' ? v.settled_on !== null : v.settled_on === null,
    {
      message: 'Informe a data efetiva somente para um lançamento liquidado.',
      path: ['settled_on'],
    },
  );
export function useTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['users', user?.id, 'transactions'],
    enabled: Boolean(user),
    retry: retryDataQuery,
    queryFn: async ({ signal }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client, userId } = await userClient(user.id, signal);
      const rows: Tables<'transactions'>[] = [];
      for (let start = 0; ; start += 100) {
        const { data, error } = await client
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .order('occurred_on', { ascending: false })
          .order('id')
          .range(start, start + 99)
          .abortSignal(signal);
        if (error) throw databaseError(error);
        if (
          data.some(
            (r) =>
              r.user_id !== userId || !Number.isSafeInteger(r.amount_cents),
          )
        )
          throw new DataError('schema', 'Dados incompatíveis com a conta.');
        rows.push(...data);
        if (data.length < 100) return rows;
      }
    },
  });
}
export function useSaveTransaction() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      values,
      key,
    }: {
      values: Record<string, string>;
      key: string;
    }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const input = transactionInput.parse(values);
      const { client, userId } = await userClient(user.id);
      const { data: account, error: accountError } = await client
        .from('accounts')
        .select('opening_balance_date,is_active')
        .eq('user_id', userId)
        .eq('id', input.account_id)
        .single();
      if (accountError) throw databaseError(accountError);
      if (
        !account.is_active ||
        (input.settled_on && input.settled_on < account.opening_balance_date)
      )
        throw new DataError(
          'invalid',
          'A conta deve estar ativa e a liquidação deve ocorrer após a data do saldo inicial.',
        );
      const payload = {
        ...input,
        user_id: userId,
        idempotency_key: z.uuid().parse(key),
      };
      const { data, error } = await client
        .from('transactions')
        .insert(payload)
        .select()
        .single();
      if (error) {
        if (error.code !== '23505') throw databaseError(error);
        const { data: existing, error: readError } = await client
          .from('transactions')
          .select()
          .eq('user_id', userId)
          .eq('idempotency_key', key)
          .single();
        if (readError) throw databaseError(readError);
        if (
          Object.entries(payload).some(
            ([field, value]) =>
              existing[field as keyof typeof existing] !== value,
          )
        )
          throw new DataError(
            'conflict',
            'Esta tentativa já foi registrada com outros dados. Atualize a página.',
          );
        return existing;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', user?.id] }),
  });
}
