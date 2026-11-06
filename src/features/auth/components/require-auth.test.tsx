import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { User } from '@supabase/supabase-js';
import { AuthContext, type AuthContextValue } from '../auth-context';
import { RequireAuth } from './require-auth';

const user: User = {
  id: 'user-a',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-10-29T00:00:00Z',
};

function renderRoute(overrides: Partial<AuthContextValue>) {
  const value: AuthContextValue = {
    user: null,
    status: 'anonymous',
    error: null,
    retry: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/cartoes']}>
        <Routes>
          <Route path="/login" element={<h1>Login público</h1>} />
          <Route element={<RequireAuth />}>
            <Route
              path="/cartoes"
              element={<h1>Conteúdo financeiro privado</h1>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('RequireAuth', () => {
  it('redirects anonymous sessions before mounting protected content', () => {
    renderRoute({});
    expect(screen.getByText('Login público')).toBeInTheDocument();
    expect(
      screen.queryByText('Conteúdo financeiro privado'),
    ).not.toBeInTheDocument();
  });
  it('withholds content during verification even if a user object exists', () => {
    renderRoute({ status: 'loading', user });
    expect(screen.getByText('Verificando sua sessão')).toBeInTheDocument();
    expect(
      screen.queryByText('Conteúdo financeiro privado'),
    ).not.toBeInTheDocument();
  });
  it('fails closed when remote verification fails', () => {
    renderRoute({ status: 'error', error: 'Sessão inválida', user });
    expect(screen.getByRole('alert')).toHaveTextContent('Sessão inválida');
    expect(
      screen.queryByText('Conteúdo financeiro privado'),
    ).not.toBeInTheDocument();
  });
  it('renders protected content only for an authenticated user', () => {
    renderRoute({ status: 'authenticated', user });
    expect(screen.getByText('Conteúdo financeiro privado')).toBeInTheDocument();
  });
});
