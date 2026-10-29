import { CreditCard } from 'lucide-react';
import { FeaturePage } from '@/components/shared/feature-page';
export function CardsPage() {
  return (
    <FeaturePage
      title="Seus cartões"
      description="Acompanhe seus compromissos sem compartilhar dados bancários sensíveis."
      icon={CreditCard}
      items={[
        'Cadastro por nome, instituição e cor',
        'Fechamento, vencimento e faturas mensais',
        'Limite opcional e total comprometido',
      ]}
    />
  );
}
