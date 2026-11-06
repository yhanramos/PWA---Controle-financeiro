import { z } from 'zod';
import { userClient } from '@/lib/supabase/user-client';
import { DataError, databaseError } from '@/services/data-error';
import { categorySchema } from '../schemas/category-schema';

export async function getCategories(
  expectedUserId: string,
  signal: AbortSignal,
) {
  const { client, userId } = await userClient(expectedUserId, signal);
  // Paginação explícita para não truncar silenciosamente no limite da API.
  const categories: z.infer<typeof categorySchema>[] = [];
  const pageSize = 100;
  for (let start = 0; ; start += pageSize) {
    signal.throwIfAborted();
    const { data, error } = await client
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name')
      .order('id')
      .range(start, start + pageSize - 1)
      .abortSignal(signal);
    signal.throwIfAborted();
    if (error) throw databaseError(error);
    const parsed = z.array(categorySchema).safeParse(data);
    if (
      !parsed.success ||
      parsed.data.some((category) => category.user_id !== userId)
    )
      throw new DataError(
        'schema',
        'As categorias recebidas são incompatíveis com sua conta.',
      );
    categories.push(...parsed.data);
    if (parsed.data.length < pageSize) return categories;
  }
}
