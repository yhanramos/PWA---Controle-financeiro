import { isAuthError, type Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/client';
import { requireConnection } from '@/services/network';
import { loginSchema, type LoginValues } from '../schemas/login-schema';

export function authErrorMessage(error: unknown) {
  if (!navigator.onLine) return 'Conecte-se à internet para acessar sua conta.';
  if (isAuthError(error)) {
    if (error.code === 'invalid_credentials')
      return 'E-mail ou senha inválidos.';
    if (error.code === 'email_not_confirmed')
      return 'Confirme seu e-mail antes de entrar.';
    if (error.status === 429)
      return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  }
  return 'Não foi possível autenticar sua conta. Verifique a conexão e tente novamente.';
}

export async function signIn(values: LoginValues) {
  requireConnection();
  const credentials = loginSchema.parse(values);
  const { error } = await createClient().auth.signInWithPassword(credentials);
  if (error) throw error;
}

export async function validateSession(session: Session) {
  requireConnection();
  // Confirma o usuário no Auth; dados lidos do storage não autorizam acesso.
  const { data, error } = await createClient().auth.getUser(
    session.access_token,
  );
  if (error) throw error;
  if (!data.user) throw new Error('Sessão inválida.');
  return data.user;
}

export async function signOut() {
  requireConnection();
  const { error } = await createClient().auth.signOut({ scope: 'local' });
  if (error) throw error;
}
