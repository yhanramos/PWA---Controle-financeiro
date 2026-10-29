import { z } from 'zod';

const schema = z.object({
  url: z.url().refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === 'https:' ||
      (url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname))
    );
  }),
  publishableKey: z.string().min(20),
});

export const environment = schema.safeParse({
  url: import.meta.env.VITE_SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});
