import { z } from 'zod';

export const profileSchema = z.object({
  id: z.uuid(),
  display_name: z.string().max(120),
  currency: z.literal('BRL'),
  timezone: z.literal('America/Sao_Paulo'),
  created_at: z.string(),
  updated_at: z.string(),
});

export const profileFormSchema = z.object({
  display_name: z.string().trim().max(120, 'Use no máximo 120 caracteres.'),
});
export type Profile = z.infer<typeof profileSchema>;
export type ProfileFormValues = z.infer<typeof profileFormSchema>;
