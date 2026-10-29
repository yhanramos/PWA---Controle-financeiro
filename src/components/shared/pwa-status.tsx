import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
export function PwaStatus() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <aside className="update-notice" role="status">
      <span>Uma nova versão está disponível.</span>
      <Button onClick={() => void updateServiceWorker(true)}>Atualizar</Button>
      <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
        Depois
      </Button>
    </aside>
  );
}
