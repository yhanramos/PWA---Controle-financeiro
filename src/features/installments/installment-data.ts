import { z } from 'zod';
import { useRef } from 'react';
import { currentDate } from '@/lib/utils/calendar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import { positiveMoneyInput } from '@/lib/financial-money';
import { DataError, databaseError } from '@/services/data-error';
import type { Tables } from '@/lib/supabase/database.types';
import { firstUnpaidDates, cardCalendarSchema } from './installment-calendar';
export const planInput = z
  .object({
    description: z.string().trim().min(1).max(200),
    card_id: z.uuid(),
    category_id: z.uuid(),
    total: positiveMoneyInput,
    count: z.coerce.number().int().min(1).max(600),
    historical: z.coerce.number().int().min(0),
    purchased_on: z.iso.date(),
  })
  .refine((v) => v.historical < v.count && v.total >= v.count, {
    message:
      'Confira o valor e a quantidade de parcelas, incluindo as já pagas.',
  });
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
  const submission = useRef<{ key: string; date: string } | null>(null);
  return useMutation({
    mutationFn: async ({
      key,
      values,
    }: {
      key: string;
      values: Record<string, string>;
    }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      if (submission.current?.key !== key) {
        submission.current = { key, date: currentDate() };
      }
      const input = planInput.parse({
        ...values,
        purchased_on: submission.current.date,
      });
      const { client, userId } = await userClient(user.id);
      const { data: card, error: cardError } = await client
        .from('credit_cards')
        .select('closing_day, due_day')
        .eq('user_id', userId)
        .eq('id', input.card_id)
        .eq('is_active', true)
        .single();
      if (cardError) throw databaseError(cardError);
      const dates = firstUnpaidDates(
        input.purchased_on,
        input.historical,
        cardCalendarSchema.parse(card),
      );
      const { data: invoice, error: invoiceError } = await client
        .from('credit_card_invoices')
        .select('closing_date, due_date')
        .eq('user_id', userId)
        .eq('credit_card_id', input.card_id)
        .eq('reference_month', `${dates.first_due.slice(0, 7)}-01`)
        .maybeSingle();
      if (invoiceError) throw databaseError(invoiceError);
      const resolvedDates = invoice
        ? {
            first_close: z.iso.date().parse(invoice.closing_date),
            first_due: z.iso.date().parse(invoice.due_date),
          }
        : dates;
      const { data, error } = await client.rpc('create_installment_plan', {
        p_key: z.uuid().parse(key),
        p_input: { ...input, ...resolvedDates },
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
