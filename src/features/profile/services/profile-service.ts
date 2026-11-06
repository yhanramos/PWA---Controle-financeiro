import { userClient } from '@/lib/supabase/user-client';
import { databaseError, DataError } from '@/services/data-error';
import {
  profileSchema,
  profileFormSchema,
  type ProfileFormValues,
} from '../schemas/profile-schema';

const columns = 'id, display_name, currency, timezone, created_at, updated_at';

export async function getProfile(expectedUserId: string, signal: AbortSignal) {
  const { client, userId } = await userClient(expectedUserId, signal);
  const { data, error } = await client
    .from('profiles')
    .select(columns)
    .eq('id', userId)
    .abortSignal(signal)
    .maybeSingle();
  signal.throwIfAborted();
  if (error) throw databaseError(error);
  if (!data) return null;
  const result = profileSchema.safeParse(data);
  if (!result.success || result.data.id !== userId)
    throw new DataError(
      'schema',
      'O perfil recebido é incompatível com sua conta.',
    );
  return result.data;
}

export async function updateProfile(
  expectedUserId: string,
  input: ProfileFormValues,
) {
  const payload = profileFormSchema.parse(input);
  const { client, userId } = await userClient(expectedUserId);
  // Somente display_name é editável. Sem upsert, inserção de perfil ou user_id vindo do formulário.
  const { data, error } = await client
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select(columns)
    .maybeSingle();
  if (error) throw databaseError(error);
  if (!data)
    throw new DataError(
      'permission',
      'Não foi possível atualizar seu perfil. Verifique se ele está disponível.',
    );
  const result = profileSchema.safeParse(data);
  if (!result.success || result.data.id !== userId)
    throw new DataError(
      'schema',
      'Não foi possível confirmar os dados salvos. Recarregue seu perfil.',
    );
  return result.data;
}
