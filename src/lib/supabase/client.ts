import { createClient } from '@supabase/supabase-js';
import { environment } from '@/lib/validators/environment';
import type { Database } from './database.types';

// Ausência de configuração não causa crash nem ativa um backend fictício.
export const supabase = environment.success
  ? createClient<Database>(
      environment.data.url,
      environment.data.publishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      },
    )
  : null;
