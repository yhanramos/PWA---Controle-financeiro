import { Layers } from 'lucide-react';
import { FeaturePage } from '@/components/shared/feature-page';
export function InstallmentsPage() {
  return (
    <FeaturePage
      title="Parcelamentos"
      description="Mais previsibilidade para os próximos meses."
      icon={Layers}
      items={[
        'Distribuição exata dos centavos entre parcelas',
        'Importação de compromissos antigos',
        'Cronograma e quitação antecipada quando permitida',
      ]}
    />
  );
}
