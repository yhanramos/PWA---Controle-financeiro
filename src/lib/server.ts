import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr';
import type { Database } from './supabase/database.types';

// Apenas para um futuro runtime de servidor. Não importar em componentes da SPA.
export function createClient(request: Request) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Configure as variáveis públicas do Supabase no servidor.');
  }
  const headers = new Headers();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '').flatMap(
          ({ name, value }) =>
            typeof value === 'string' ? [{ name, value }] : [],
        );
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          headers.append(
            'Set-Cookie',
            serializeCookieHeader(name, value, options),
          ),
        );
      },
    },
  });

  return { supabase, headers };
}
