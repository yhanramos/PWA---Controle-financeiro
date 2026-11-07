import { z } from 'zod';
import { userClient } from '@/lib/supabase/user-client';
import { DataError } from '@/services/data-error';

const option = z.object({ id: z.uuid(), name: z.string() });
const stateSchema = z.object({
  enabled: z.boolean(),
  cards: z.array(option),
  categories: z.array(option),
  mappings: z.array(
    z.object({ alias: z.string(), card_id: z.uuid(), category_id: z.uuid() }),
  ),
  last_received_at: z.string().nullable(),
  token: z.string().optional(),
});
export type WalletState = z.infer<typeof stateSchema>;
export type WalletAction = {
  action: 'status' | 'rotate' | 'revoke' | 'save' | 'remove';
  alias?: string;
  card_id?: string;
  category_id?: string;
};

export async function configureWallet(
  userId: string,
  body: WalletAction,
  signal?: AbortSignal,
) {
  const { client } = await userClient(userId, signal);
  const { data, error } = await client.functions.invoke('apple-wallet', {
    body,
    signal,
  });
  signal?.throwIfAborted();
  if (error)
    throw new DataError(
      'schema',
      'Não foi possível acessar a integração. Confira sua conexão e se a função apple-wallet e a migration já foram publicadas.',
    );
  return stateSchema.parse(data);
}
