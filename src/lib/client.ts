import { supabase } from '@/lib/supabase/client';

// Adaptador do bloco Supabase: a SPA reutiliza uma única instância.
export function createClient() {
  if (!supabase) {
    throw new Error(
      'Configure as variáveis públicas do Supabase em .env.local.',
    );
  }
  return supabase;
}
