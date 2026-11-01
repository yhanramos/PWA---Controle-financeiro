import { useState } from 'react';
import { Tags } from 'lucide-react';
import { z } from 'zod';
import {
  FinancialWorkspace,
  type Field,
} from '@/features/shared/financial-workspace';
import { RecordEditor } from '@/features/shared/record-editor';
import { useCreateFinancialRow } from '@/features/shared/financial-data';
import { useCategories } from './hooks/use-categories';
import { DataState } from '@/components/shared/data-state';
import { Button } from '@/components/ui/button';
import { dataErrorMessage } from '@/services/data-error';
const schema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'Informe uma cor como #8073f5.'),
});
const fields: Field[] = [
  { name: 'name', label: 'Nome', required: true },
  {
    name: 'kind',
    label: 'Tipo',
    kind: 'select',
    required: true,
    options: [
      { value: 'income', label: 'Receita' },
      { value: 'expense', label: 'Despesa' },
    ],
  },
  {
    name: 'color',
    label: 'Cor hexadecimal',
    placeholder: '#8073f5',
    required: true,
  },
];
export function CategoriesPage() {
  const query = useCategories();
  const save = useCreateFinancialRow('categories');
  const [kind, setKind] = useState('expense');
  if (query.isError)
    return (
      <DataState
        title="Não foi possível carregar categorias"
        error
        description={dataErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data) return <DataState title="Carregando categorias…" loading />;
  const rows = query.data.filter((r) => r.kind === kind);
  return (
    <div className="page-stack">
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
      <FinancialWorkspace
        title="Categorias"
        eyebrow="CADA VALOR NO SEU LUGAR"
        description="Cadastre e organize as categorias dos seus lançamentos."
        action="Nova categoria"
        icon={<Tags />}
        fields={fields}
        onSave={async (values) => {
          await save.mutateAsync(schema.parse(values));
        }}
        rows={rows.map((r) => ({
          title: r.name,
          detail: r.is_active ? 'Ativa' : 'Inativa',
          value: r.color,
        }))}
        note="Desativar uma categoria preserva o histórico. O tipo é mantido para não alterar a natureza dos lançamentos existentes."
      />
      {rows.map((row) => (
        <RecordEditor key={row.id} table="categories" row={row} />
      ))}
    </div>
  );
}
