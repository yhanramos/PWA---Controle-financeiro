import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import { positiveMoneyInput } from '@/lib/financial-money';
import { DataError, databaseError } from '@/services/data-error';
export const recurrenceInput = z
  .object({
    description: z.string().trim().min(1).max(200),
    kind: z.enum(['income', 'expense']),
    amount_cents: positiveMoneyInput,
    category_id: z.uuid(),
    account_id: z.union([z.literal(''), z.uuid()]).optional(),
    credit_card_id: z.union([z.literal(''), z.uuid()]).optional(),
    payment_method: z.enum(['cash', 'pix', 'debit', 'bank_transfer', 'credit']),
    interval_unit: z.enum(['day', 'week', 'month', 'year']),
    interval_count: z.coerce.number().int().min(1).max(365),
    starts_on: z.iso.date(),
    ends_on: z.union([z.literal(''), z.iso.date()]).transform((v) => v || null),
  })
  .refine((v) => !v.ends_on || v.ends_on >= v.starts_on, {
    message: 'O fim deve ser posterior ao início.',
  })
  .refine(
    (v) =>
      v.payment_method === 'credit'
        ? v.kind === 'expense' && Boolean(v.credit_card_id)
        : Boolean(v.account_id),
    {
      message:
        'Crédito exige despesa e cartão. As demais formas exigem uma conta.',
    },
  )
  .transform((v) => ({
    ...v,
    account_id: v.payment_method === 'credit' ? null : v.account_id || null,
    credit_card_id:
      v.payment_method === 'credit' ? v.credit_card_id || null : null,
  }));
export function useRecurrenceAction() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      action:
        | { kind: 'create'; key: string; values: Record<string, string> }
        | { kind: 'generate'; id: string; until: string }
        | {
            kind: 'edit';
            id: string;
            version: string;
            description: string;
            amount: string;
            end: string;
            active: boolean;
          },
    ) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client, userId } = await userClient(user.id);
      if (action.kind === 'create') {
        const input = recurrenceInput.parse(action.values);
        const payload = {
          ...input,
          user_id: userId,
          idempotency_key: action.key,
        };
        const { data, error } = await client
          .from('recurring_transactions')
          .insert(payload)
          .select()
          .single();
        if (error) {
          if (error.code !== '23505') throw databaseError(error);
          const { data: prior, error: readError } = await client
            .from('recurring_transactions')
            .select()
            .eq('user_id', userId)
            .eq('idempotency_key', action.key)
            .single();
          if (readError) throw databaseError(readError);
          if (
            Object.entries(payload).some(
              ([k, v]) => prior[k as keyof typeof prior] !== v,
            )
          )
            throw new DataError(
              'conflict',
              'Tentativa repetida com outros dados. Atualize a página.',
            );
          return prior.id;
        }
        return data.id;
      }
      const result =
        action.kind === 'generate'
          ? await client.rpc('generate_recurrences', {
              p_rule: action.id,
              p_until: z.iso.date().parse(action.until),
            })
          : await client.rpc('update_recurrence', {
              p_rule: action.id,
              p_version: action.version,
              p_description: action.description,
              p_amount: positiveMoneyInput.parse(action.amount),
              p_end: action.end || null,
              p_active: action.active,
            });
      if (result.error) throw databaseError(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', user?.id] }),
  });
}
