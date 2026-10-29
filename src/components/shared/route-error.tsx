import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
export function RouteError() {
  return (
    <main className="standalone">
      <h1>Não foi possível abrir esta página</h1>
      <p>Tente novamente. Se você estiver offline, reconecte-se à internet.</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
