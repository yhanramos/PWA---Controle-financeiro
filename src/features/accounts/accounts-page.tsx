import { RecordEditor } from '@/features/shared/record-editor';
import { moneyInput } from '@/lib/financial-money';
import { Wallet } from 'lucide-react';
import {
  FinancialWorkspace,
  type Field,
} from '@/features/shared/financial-workspace';
import {
  useCreateFinancialRow,
  useFinancialRows,
} from '@/features/shared/financial-data';
import { dataErrorMessage } from '@/services/data-error';
import { DataState } from '@/components/shared/data-state';
const fields: Field[] = [
  { name: 'name', label: 'Nome da conta', required: true },
  { name: 'institution', label: 'Instituição (opcional)' },
  {
    name: 'kind',
    label: 'Tipo',
    kind: 'select',
    required: true,
    options: [
      { value: 'checking', label: 'Conta corrente' },
      { value: 'savings', label: 'Poupança' },
      { value: 'cash', label: 'Dinheiro' },
      { value: 'other', label: 'Outra' },
    ],
  },
  {
    name: 'opening_balance_cents',
    label: 'Saldo inicial (R$)',
    required: true,
  },
  {
    name: 'opening_balance_date',
    label: 'Data do saldo inicial',
    kind: 'date',
    required: true,
  },
];
export function AccountsPage() {
  const q = useFinancialRows('accounts');
  const m = useCreateFinancialRow('accounts');
  if (q.isPending) return <DataState title="Carregando contas…" loading />;
  if (q.isError)
    return (
      <DataState
        title="Não foi possível carregar as contas"
        error
        description={dataErrorMessage(q.error)}
        onRetry={() => void q.refetch()}
      />
    );
  return (
    <>
      <FinancialWorkspace
        title="Contas"
        eyebrow="SEU DINHEIRO, NO SEU LUGAR"
        description="Contas, dinheiro em espécie e saldos iniciais."
        action="Adicionar conta"
        icon={<Wallet />}
        fields={fields}
        onSave={async (v) => {
          const cents = moneyInput.parse(v.opening_balance_cents);
          if (!Number.isSafeInteger(cents)) throw Error('Invalid cents');
          await m.mutateAsync({ ...v, opening_balance_cents: cents });
        }}
        rows={q.data.map((r) => ({
          title: String(r.name),
          detail: `${r.kind} · desde ${r.opening_balance_date}`,
          value: `${(Number(r.opening_balance_cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        }))}
        note="O saldo inicial é uma referência histórica; não cria uma movimentação recebida."
      />
      {q.data.map((row) => (
        <RecordEditor key={String(row.id)} table="accounts" row={row} />
      ))}
    </>
  );
}
