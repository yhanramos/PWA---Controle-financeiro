import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import { positiveMoneyInput } from '@/lib/financial-money';
import { DataError, databaseError } from '@/services/data-error';
const input = z.object({
  description: z.string().trim().min(1).max(200),
  card: z.uuid(),
  category: z.uuid(),
  amount: positiveMoneyInput,
  date: z.iso.date(),
  month: z
    .union([z.literal(''), z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)])
    .transform((v) => (v ? `${v}-01` : null)),
});
export function useCreditPurchase() {
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
      const v = input.parse(values);
      const { client } = await userClient(user.id);
      const { data, error } = await client.rpc('create_credit_purchase', {
        p_key: key,
        p_description: v.description,
        p_card: v.card,
        p_category: v.category,
        p_amount: v.amount,
        p_date: v.date,
        p_month: v.month,
      });
      if (error) throw databaseError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', user?.id] }),
  });
}
