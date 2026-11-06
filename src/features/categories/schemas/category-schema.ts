import { z } from 'zod';

export const categorySchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  name: z.string().min(1).max(80),
  kind: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
