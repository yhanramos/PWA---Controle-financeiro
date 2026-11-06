import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useOnline } from '@/hooks/use-online';

export function LogoutButton() {
  const { signOut } = useAuth();
  const online = useOnline();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function logout() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await signOut();
    } catch {
      setError('Não foi possível sair. Reconecte-se e tente novamente.');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="logout-control">
      <Button
        variant="ghost"
        onClick={() => void logout()}
        disabled={pending || !online}
        title={!online ? 'Conecte-se para encerrar a sessão.' : undefined}
      >
        <LogOut size={17} />
        {pending ? 'Saindo…' : 'Sair'}
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
