import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import { positiveMoneyInput } from '@/lib/financial-money';
import { DataError, databaseError } from '@/services/data-error';
import type { Tables } from '@/lib/supabase/database.types';
export const planInput = z
  .object({
    description: z.string().trim().min(1).max(200),
    card_id: z.uuid(),
    category_id: z.uuid(),
    total: positiveMoneyInput,
    count: z.coerce.number().int().min(1).max(600),
    historical: z.coerce.number().int().min(0),
    purchased_on: z.iso.date(),
    first_due: z.iso.date(),
    first_close: z.iso.date(),
  })
  .refine(
    (v) =>
      v.historical < v.count &&
      v.total >= v.count &&
      v.purchased_on <= v.first_close &&
      v.first_close <= v.first_due,
    {
      message:
        'Confira parcelas, valor e datas: compra ≤ fechamento ≤ vencimento.',
    },
  );
export function usePlans() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['users', user?.id, 'plans'],
    enabled: !!user,
    queryFn: async ({ signal }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client, userId } = await userClient(user.id, signal);
      const plans: Tables<'installment_plans'>[] = [];
      const parts: Tables<'installments'>[] = [];
      for (let start = 0; ; start += 100) {
        const { data, error } = await client
          .from('installment_plans')
          .select('*')
          .eq('user_id', userId)
          .order('id')
          .range(start, start + 99)
          .abortSignal(signal);
        if (error) throw databaseError(error);
        plans.push(...data);
        if (data.length < 100) break;
      }
      for (let start = 0; ; start += 100) {
        const { data, error } = await client
          .from('installments')
          .select('*')
          .eq('user_id', userId)
          .order('id')
          .range(start, start + 99)
          .abortSignal(signal);
        if (error) throw databaseError(error);
        parts.push(...data);
        if (data.length < 100) break;
      }
      return plans.map((p) => ({
        ...p,
        parts: parts
          .filter((i) => i.installment_plan_id === p.id)
          .sort((a, b) => a.installment_number - b.installment_number),
      }));
    },
  });
}
export function useCreatePlan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      key,
      values,
    }: {
      key: string;
      values: Record<string, string>;
    }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const input = planInput.parse(values);
      const { client } = await userClient(user.id);
      const { data, error } = await client.rpc('create_installment_plan', {
        p_key: z.uuid().parse(key),
        p_input: input,
      });
      if (error) throw databaseError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', user?.id] }),
  });
}

export type PlanAction =
  | {
      kind: 'edit';
      plan: string;
      version: string;
      description: string;
      notes: string;
    }
  | { kind: 'cancel'; plan: string; version: string }
  | {
      kind: 'anticipate';
      key: string;
      plan: string;
      invoice: string;
      account: string;
      discount: number;
      date: string;
    };
export function usePlanAction() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: PlanAction) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client } = await userClient(user.id);
      const result =
        action.kind === 'edit'
          ? await client.rpc('edit_installment_plan', {
              p_plan: action.plan,
              p_version: action.version,
              p_description: action.description,
              p_notes: action.notes,
            })
          : action.kind === 'cancel'
            ? await client.rpc('cancel_installment_plan', {
                p_plan: action.plan,
                p_version: action.version,
              })
            : await client.rpc('anticipate_installment_plan', {
                p_key: action.key,
                p_plan: action.plan,
                p_invoice: action.invoice,
                p_account: action.account,
                p_discount: action.discount,
                p_date: action.date,
              });
      if (result.error) throw databaseError(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', user?.id] }),
  });
}
