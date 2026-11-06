import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import {
  DataError,
  databaseError,
  retryDataQuery,
} from '@/services/data-error';

const messageSchema = z.object({
  id: z.uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(16000),
  created_at: z.iso.datetime({ offset: true }),
  user_id: z.uuid(),
});
export function useChatHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['users', user?.id, 'ai-history'],
    enabled: Boolean(user),
    retry: retryDataQuery,
    networkMode: 'always',
    queryFn: async ({ signal }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client, userId } = await userClient(user.id, signal);
      const { data, error } = await client
        .from('chat_messages')
        .select('id,role,content,created_at,user_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('role')
        .limit(40)
        .abortSignal(signal);
      if (error) throw databaseError(error);
      const messages = z.array(messageSchema).parse(data);
      if (messages.some((message) => message.user_id !== userId))
        throw new DataError('permission', 'Histórico indisponível.');
      return messages.sort(
        (a, b) =>
          a.created_at.localeCompare(b.created_at) ||
          (a.role === b.role
            ? a.id.localeCompare(b.id)
            : a.role === 'user'
              ? -1
              : 1),
      );
    },
  });
}
export function useAssistant() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (input: {
      requestId: string;
      conversationId: string;
      message: string;
    }) => {
      if (!user) throw new DataError('session', 'Entre novamente.');
      const { client } = await userClient(user.id);
      const { data, error } = await client.functions.invoke(
        'financial-assistant',
        { body: input },
      );
      if (error) {
        const context: unknown = 'context' in error ? error.context : undefined;
        if (context instanceof Response) {
          const body: unknown = await context
            .clone()
            .json()
            .catch(() => null);
          const parsed = z
            .object({ error: z.string().max(500) })
            .safeParse(body);
          if (parsed.success)
            throw new DataError('unavailable', parsed.data.error);
        }
        throw new DataError(
          'unavailable',
          'Não foi possível acessar o assistente. Verifique a conexão e a configuração da função no Supabase.',
        );
      }
      return z.object({ answer: z.string().min(1).max(8000) }).parse(data);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['users', user?.id, 'ai-history'],
      }),
  });
}
