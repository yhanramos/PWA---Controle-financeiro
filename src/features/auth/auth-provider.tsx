import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { AuthContext, type AuthState } from './auth-context';
import {
  authErrorMessage,
  signOut,
  validateSession,
} from './services/auth-service';

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const previousUser = useRef<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AuthState>({
    user: null,
    status: supabase ? 'loading' : 'unconfigured',
    error: null,
  });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let generation = 0;
    let verifiedToken: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function receive(session: Session | null) {
      if (!active) return;
      if (session && session.access_token === verifiedToken) return;
      verifiedToken = null;
      const ticket = ++generation;
      clearTimeout(timer);
      const nextId = session?.user.id ?? null;
      if (nextId !== previousUser.current || !session) {
        queryClient.clear();
        previousUser.current = nextId;
      }
      if (!session) {
        setState({ user: null, status: 'anonymous', error: null });
        return;
      }
      setState({ user: null, status: 'loading', error: null });
      // Fora do callback do SDK, evitando chamadas Auth sob seu lock interno.
      timer = setTimeout(() => {
        void validateSession(session)
          .then((user) => {
            if (active && ticket === generation) {
              verifiedToken = session.access_token;
              setState({ user, status: 'authenticated', error: null });
            }
          })
          .catch((error: unknown) => {
            if (active && ticket === generation) {
              queryClient.clear();
              setState({
                user: null,
                status: 'error',
                error: authErrorMessage(error),
              });
            }
          });
      }, 0);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => receive(session));
    const initialGeneration = generation;
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || generation !== initialGeneration) return;
        if (error) {
          queryClient.clear();
          setState({
            user: null,
            status: 'error',
            error: authErrorMessage(error),
          });
        } else {
          receive(data.session);
        }
      })
      .catch((error: unknown) => {
        if (active && generation === initialGeneration) {
          setState({
            user: null,
            status: 'error',
            error: authErrorMessage(error),
          });
        }
      });
    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [attempt, queryClient]);

  async function logout() {
    await signOut();
    queryClient.clear();
    previousUser.current = null;
    setState({ user: null, status: 'anonymous', error: null });
  }

  function retry() {
    setState({ user: null, status: 'loading', error: null });
    setAttempt((value) => value + 1);
  }

  return (
    <AuthContext.Provider value={{ ...state, retry, signOut: logout }}>
      {children}
    </AuthContext.Provider>
  );
}
