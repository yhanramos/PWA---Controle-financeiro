import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { useOnline } from '@/hooks/use-online';
import { retryDataQuery, DataError } from '@/services/data-error';
import { getProfile, updateProfile } from '../services/profile-service';
import type { ProfileFormValues } from '../schemas/profile-schema';

const profileKey = (userId?: string) => ['users', userId, 'profile'] as const;

export function useProfile() {
  const { user, status } = useAuth();
  const online = useOnline();
  return useQuery({
    queryKey: profileKey(user?.id),
    enabled: status === 'authenticated' && Boolean(user) && online,
    queryFn: ({ signal }) => {
      if (!user)
        throw new DataError(
          'session',
          'Entre novamente para acessar seu perfil.',
        );
      return getProfile(user.id, signal);
    },
    retry: retryDataQuery,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...profileKey(user?.id), 'update'],
    retry: false,
    networkMode: 'always',
    mutationFn: (values: ProfileFormValues) => {
      if (!user)
        throw new DataError(
          'session',
          'Entre novamente para editar seu perfil.',
        );
      return updateProfile(user.id, values);
    },
    // Não recria dados antigos no cache após logout/troca de conta.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: profileKey(user?.id),
        exact: true,
      }),
  });
}
