import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/use-auth';
import { AuthStatus } from './auth-status';

export function RequireAuth() {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  if (status !== 'authenticated' || !user) return <AuthStatus />;
  // Remonta estados locais ao trocar de conta, além da limpeza do QueryClient.
  return <Outlet key={user.id} />;
}
