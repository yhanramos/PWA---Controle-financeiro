import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogoutButton } from './logout-button';

export function AuthStatus() {
  const { status, error, retry } = useAuth();
  return (
    <main className="standalone" aria-busy={status === 'loading'}>
      {status === 'loading' ? (
        <>
          <LoaderCircle size={32} />
          <h1>Verificando sua sessão</h1>
          <p role="status">Aguarde enquanto confirmamos seu acesso.</p>
        </>
      ) : (
        <>
          <ShieldCheck size={32} />
          <h1>
            {status === 'unconfigured'
              ? 'Configuração pendente'
              : 'Não foi possível verificar sua sessão'}
          </h1>
          <p role="alert">
            {status === 'unconfigured'
              ? 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em .env.local e reinicie o servidor local.'
              : error}
          </p>
          {status !== 'unconfigured' && (
            <>
              <Button onClick={retry}>Tentar novamente</Button>
              <LogoutButton />
            </>
          )}
        </>
      )}
    </main>
  );
}
