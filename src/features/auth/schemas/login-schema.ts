import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .pipe(z.email('Informe um e-mail válido.').max(254, 'E-mail muito longo.')),
  password: z
    .string()
    .min(1, 'Informe sua senha.')
    .max(1024, 'Senha muito longa.'),
});

export type LoginValues = z.infer<typeof loginSchema>;
