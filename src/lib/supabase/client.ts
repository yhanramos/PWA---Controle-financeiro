import { createClient } from '@supabase/supabase-js';
import { environment } from '@/lib/validators/environment';

// Ausência de configuração não causa crash nem ativa um backend fictício.
export const supabase = environment.success
  ? createClient(environment.data.url, environment.data.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
