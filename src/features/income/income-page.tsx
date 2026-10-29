import { TrendingUp } from 'lucide-react';
import { FeaturePage } from '@/components/shared/feature-page';
export function IncomePage() {
  return (
    <FeaturePage
      title="Receitas"
      description="Organize o que chegou e o que ainda está por vir."
      icon={TrendingUp}
      items={[
        'Salário, freelances e rendas extras',
        'Datas prevista e efetiva de recebimento',
        'Separação entre receitas previstas e recebidas',
      ]}
    />
  );
}
