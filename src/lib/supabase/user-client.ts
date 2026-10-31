import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabase } from './client';
import type { Database } from './database.types';
import { environment } from '@/lib/validators/environment';
import { DataError } from '@/services/data-error';

/** Snapshot do JWT por operação: uma troca de conta não muda o autor de uma requisição em andamento. */
export async function userClient(expectedUserId: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (!navigator.onLine)
    throw new DataError(
      'offline',
      'Conecte-se à internet para acessar ou salvar seus dados.',
    );
  if (!supabase || !environment.success)
    throw new DataError('schema', 'A conexão com o banco não foi configurada.');
  const userId = z.uuid().parse(expectedUserId);
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  signal?.throwIfAborted();
  if (error || !session || session.user.id !== userId)
    throw new DataError(
      'session',
      'Sua sessão mudou. Entre novamente para continuar.',
    );
  // Cada leitura/escrita remota ainda é autorizada pelo JWT e pelo RLS do Supabase.
  const client = createClient<Database>(
    environment.data.url,
    environment.data.publishableKey,
    {
      accessToken: async () => session.access_token,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  return { client, userId };
}
