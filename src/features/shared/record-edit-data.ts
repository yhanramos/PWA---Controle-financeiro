import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import { DataError, databaseError } from '@/services/data-error';
import type { Json } from '@/lib/supabase/database.types';
export type EditableTable =
  'accounts' | 'categories' | 'credit_cards' | 'transactions';
export function useEditRecord(table: EditableTable) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      version,
      changes,
    }: {
      id: string;
      version: string;
      changes: Record<string, Json>;
    }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client } = await userClient(user.id);
      const { data, error } = await client.rpc('edit_financial_record', {
        p_table: table,
        p_id: id,
        p_version: version,
        p_changes: changes,
      });
      if (error) throw databaseError(error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', user?.id] }),
  });
}
