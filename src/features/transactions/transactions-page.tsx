import { ArrowDownUp } from 'lucide-react';
import { FeaturePage } from '@/components/shared/feature-page';
export function TransactionsPage() {
  return (
    <FeaturePage
      title="Movimentações"
      description="Cada entrada e saída tem seu lugar."
      icon={ArrowDownUp}
      items={[
        'Receitas e despesas com status explícito',
        'Forma de pagamento, conta e categoria',
        'Registros persistidos e associados ao usuário',
      ]}
    />
  );
}
