import { useRef } from 'react';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import {
  DataError,
  databaseError,
  retryDataQuery,
} from '@/services/data-error';
const name = z.string().trim().min(1).max(100);
const money = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
const accountInput = z.object({
  name,
  institution: z.string().trim().max(100).nullable().optional(),
  kind: z.enum(['checking', 'savings', 'cash', 'other']),
  opening_balance_cents: money,
  opening_balance_date: z.iso.date(),
});
const categoryInput = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});
const cardInput = z.object({
  name,
  institution: name,
  closing_day: z.number().int().min(1).max(31),
  due_day: z.number().int().min(1).max(31),
  credit_limit_cents: money.refine((v) => v >= 0).nullable(),
  allows_early_settlement: z.boolean().nullable(),
});
export function useFinancialRows(
  table:
    | 'accounts'
    | 'categories'
    | 'credit_cards'
    | 'transactions'
    | 'recurring_transactions',
  enabled = true,
) {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: ['users', user?.id, table],
    enabled: enabled && status === 'authenticated' && Boolean(user),
    retry: retryDataQuery,
    queryFn: async ({ signal }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client, userId } = await userClient(user.id, signal);
      const rows: Record<string, unknown>[] = [];
      for (let start = 0; ; start += 100) {
        const { data, error } = await client
          .from(table)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .order('id')
          .range(start, start + 99)
          .abortSignal(signal);
        if (error) throw databaseError(error);
        if (data.some((row) => row.user_id !== userId))
          throw new DataError('schema', 'Dados incompatíveis com a conta.');
        rows.push(...data);
        if (data.length < 100) return rows;
      }
    },
  });
}
export function useCreateFinancialRow(
  table: 'accounts' | 'categories' | 'credit_cards',
) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const requestId = useRef(crypto.randomUUID());
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!user)
        throw new DataError('session', 'Entre novamente para continuar.');
      const { client, userId } = await userClient(user.id);
      const identity = { user_id: userId, id: requestId.current };
      const payload =
        table === 'accounts'
          ? { ...accountInput.parse(values), ...identity }
          : table === 'categories'
            ? { ...categoryInput.parse(values), ...identity }
            : { ...cardInput.parse(values), ...identity };
      const result =
        table === 'accounts'
          ? await client
              .from('accounts')
              .insert({ ...accountInput.parse(values), ...identity })
              .select('*')
              .single()
          : table === 'categories'
            ? await client
                .from('categories')
                .insert({ ...categoryInput.parse(values), ...identity })
                .select('*')
                .single()
            : await client
                .from('credit_cards')
                .insert({ ...cardInput.parse(values), ...identity })
                .select('*')
                .single();
      if (result.error) {
        if (result.error.code !== '23505') throw databaseError(result.error);
        const { data: prior, error } = await client
          .from(table)
          .select('*')
          .eq('id', identity.id)
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw databaseError(error);
        if (
          !prior ||
          Object.entries(payload).some(
            ([key, value]) =>
              !Object.entries(prior).some(
                ([field, saved]) => field === key && saved === value,
              ),
          )
        )
          throw new DataError(
            'conflict',
            'Cadastro existente ou tentativa anterior com dados diferentes. Atualize a página.',
          );
        return prior;
      }
      return result.data;
    },
    onSuccess: () => {
      requestId.current = crypto.randomUUID();
      return qc.invalidateQueries({ queryKey: ['users', user?.id, table] });
    },
  });
}
