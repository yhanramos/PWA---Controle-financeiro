import { Tags } from 'lucide-react';
import { FeaturePage } from '@/components/shared/feature-page';
export function CategoriesPage() {
  return (
    <FeaturePage
      title="Categorias"
      description="Uma organização que faz sentido para você."
      icon={Tags}
      items={[
        'Categorias padrão de receitas e despesas',
        'Categorias personalizadas por usuário',
        'Classificação para análises mensais',
      ]}
    />
  );
}
