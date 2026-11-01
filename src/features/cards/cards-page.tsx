import { RecordEditor } from '@/features/shared/record-editor';
import { CreditCard } from 'lucide-react';
import { z } from 'zod';
import {
  FinancialWorkspace,
  type Field,
} from '@/features/shared/financial-workspace';
import {
  useCreateFinancialRow,
  useFinancialRows,
} from '@/features/shared/financial-data';
import { DataState } from '@/components/shared/data-state';
import { dataErrorMessage } from '@/services/data-error';
import { moneyInput, formatMoney } from '@/lib/financial-money';
const schema = z.object({
  name: z.string().trim().min(1).max(100),
  institution: z.string().trim().min(1).max(100),
  closing_day: z.coerce.number().int().min(1).max(31),
  due_day: z.coerce.number().int().min(1).max(31),
  credit_limit_cents: moneyInput.refine((v) => v >= 0),
  allows_early_settlement: z
    .enum(['yes', 'no', 'unknown'])
    .transform((v) => (v === 'unknown' ? null : v === 'yes')),
});
const fields: Field[] = [
  { name: 'name', label: 'Nome do cartão', required: true },
  { name: 'institution', label: 'Instituição', required: true },
  {
    name: 'closing_day',
    label: 'Dia de fechamento',
    kind: 'number',
    required: true,
  },
  {
    name: 'due_day',
    label: 'Dia de vencimento',
    kind: 'number',
    required: true,
  },
  {
    name: 'credit_limit_cents',
    label: 'Limite (R$)',
    placeholder: '0,00',
    required: true,
  },
  {
    name: 'allows_early_settlement',
    label: 'Permite antecipar parcelas?',
    kind: 'select',
    required: true,
    options: [
      { value: 'unknown', label: 'Não sei' },
      { value: 'yes', label: 'Sim' },
      { value: 'no', label: 'Não' },
    ],
  },
];
export function CardsPage() {
  const query = useFinancialRows('credit_cards');
  const mutation = useCreateFinancialRow('credit_cards');
  if (query.isPending) return <DataState title="Carregando cartões…" loading />;
  if (query.isError)
    return (
      <DataState
        title="Não foi possível carregar os cartões"
        error
        description={dataErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <>
      <FinancialWorkspace
        title="Seus cartões"
        eyebrow="CRÉDITO COM PREVISIBILIDADE"
        description="Organize seus cartões, fechamentos e vencimentos."
        action="Adicionar cartão"
        icon={<CreditCard />}
        fields={fields}
        onSave={async (values) => {
          await mutation.mutateAsync(schema.parse(values));
        }}
        rows={query.data.map((row) => ({
          title: String(row.name),
          detail: `${row.institution} · fecha dia ${row.closing_day} · vence dia ${row.due_day}`,
          value:
            row.credit_limit_cents === null
              ? 'Limite não informado'
              : formatMoney(Number(row.credit_limit_cents)),
        }))}
        note="Informe apenas os dados de organização. Número, CVV e credenciais bancárias não são solicitados."
      />
      {query.data.map((row) => (
        <RecordEditor key={String(row.id)} table="credit_cards" row={row} />
      ))}
    </>
  );
}
