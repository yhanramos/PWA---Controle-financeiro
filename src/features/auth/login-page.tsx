import { LockKeyhole } from 'lucide-react';
import { FeaturePage } from '@/components/shared/feature-page';
export function LoginPage() {
  return (
    <FeaturePage
      title="Entrar na sua conta"
      description="A autenticação será implementada na Etapa 2."
      icon={LockKeyhole}
      stage={2}
      items={[
        'Login por e-mail e senha com Supabase Auth',
        'Rotas protegidas e isolamento por usuário',
        'Limpeza de dados em memória ao encerrar a sessão',
      ]}
    />
  );
}
