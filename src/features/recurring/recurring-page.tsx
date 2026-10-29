import { Repeat2 } from 'lucide-react';
import { FeaturePage } from '@/components/shared/feature-page';
export function RecurringPage() {
  return (
    <FeaturePage
      title="Recorrências"
      description="Um espaço para os compromissos que fazem parte da sua rotina."
      icon={Repeat2}
      items={[
        'Periodicidades mensal, semanal, bimestral, anual e personalizada',
        'Geração idempotente de obrigações',
        'Alteração de vencimento e encerramento',
      ]}
    />
  );
}
