import { useState } from 'react';
import { Tags } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/shared/data-state';
import { dataErrorMessage } from '@/services/data-error';
import { useCategories } from './hooks/use-categories';

export function CategoriesPage() {
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const query = useCategories();
  const categories = query.data?.filter((category) => category.kind === kind);
  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">CADA VALOR NO SEU LUGAR</span>
        <h1>Categorias</h1>
        <p>Consulte as categorias cadastradas na sua conta.</p>
      </header>
      <div
        className="category-filters"
        role="group"
        aria-label="Tipo de categoria"
      >
        <Button
          variant={kind === 'expense' ? 'default' : 'outline'}
          aria-pressed={kind === 'expense'}
          onClick={() => setKind('expense')}
        >
          Despesas
        </Button>
        <Button
          variant={kind === 'income' ? 'default' : 'outline'}
          aria-pressed={kind === 'income'}
          onClick={() => setKind('income')}
        >
          Receitas
        </Button>
      </div>
      {query.isPending ? (
        <DataState title="Carregando suas categorias…" loading />
      ) : query.isError ? (
        <DataState
          title="Não foi possível carregar as categorias"
          error
          description={dataErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : !categories?.length ? (
        <DataState
          title="Nenhuma categoria encontrada"
          description="Sua conta ainda não possui categorias deste tipo."
        />
      ) : (
        <ul className="category-grid">
          {categories.map((category) => (
            <li key={category.id}>
              <Card className="category-card">
                <span
                  className="category-swatch"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
                <Tags size={18} aria-hidden="true" />
                <h2>{category.name}</h2>
                {!category.is_active && <span className="badge">Inativa</span>}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <p className="page-footnote">
        O cadastro e a edição de categorias estarão disponíveis na etapa de
        organização financeira.
      </p>
    </div>
  );
}
