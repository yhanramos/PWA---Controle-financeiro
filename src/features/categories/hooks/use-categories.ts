import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { useOnline } from '@/hooks/use-online';
import { retryDataQuery, DataError } from '@/services/data-error';
import { getCategories } from '../services/category-service';

export function useCategories() {
  const { user, status } = useAuth();
  const online = useOnline();
  return useQuery({
    queryKey: ['users', user?.id, 'categories'],
    enabled: status === 'authenticated' && Boolean(user) && online,
    queryFn: ({ signal }) => {
      if (!user)
        throw new DataError(
          'session',
          'Entre novamente para acessar suas categorias.',
        );
      return getCategories(user.id, signal);
    },
    retry: retryDataQuery,
  });
}
