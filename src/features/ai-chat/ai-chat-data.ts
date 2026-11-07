import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/features/auth';
import { userClient } from '@/lib/supabase/user-client';
import { DataError } from '@/services/data-error';

export class AssistantError extends DataError {
  constructor(
    message: string,
    readonly newRequestAllowed = false,
  ) {
    super('unavailable', message);
  }
}
export function useAssistant() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    gcTime: 0,
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
            .object({
              error: z.string().max(500),
              newRequestAllowed: z.boolean().optional(),
            })
            .safeParse(body);
          if (parsed.success)
            throw new AssistantError(
              parsed.data.error,
              parsed.data.newRequestAllowed === true,
            );
        }
        throw new AssistantError(
          'Não foi possível confirmar a resposta. Repita a mesma tentativa para consultar o resultado sem duplicar a despesa.',
        );
      }
      return z.object({ answer: z.string().min(1).max(8000) }).parse(data);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['users', user?.id],
      }),
  });
}
