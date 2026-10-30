import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

export type AuthStatus =
  'loading' | 'authenticated' | 'anonymous' | 'unconfigured' | 'error';
export type AuthState = {
  user: User | null;
  status: AuthStatus;
  error: string | null;
};
export type AuthContextValue = AuthState & {
  retry: () => void;
  signOut: () => Promise<void>;
};
export const AuthContext = createContext<AuthContextValue | null>(null);
