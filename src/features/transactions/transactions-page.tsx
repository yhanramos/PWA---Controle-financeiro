import { RecordEditor } from '@/features/shared/record-editor';
import { useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { Link } from 'react-router';
import {
  FinancialWorkspace,
  type Field,
} from '@/features/shared/financial-workspace';
import { useFinancialRows } from '@/features/shared/financial-data';
import { DataState } from '@/components/shared/data-state';
import { dataErrorMessage } from '@/services/data-error';
import { formatMoney } from '@/lib/financial-money';
import { useTransactions, useSaveTransaction } from './transaction-data';
export function TransactionsPage({
  incomeOnly = false,
}: {
  incomeOnly?: boolean;
}) {
  const q = useTransactions(),
    categories = useFinancialRows('categories'),
    accounts = useFinancialRows('accounts');
  const mutation = useSaveTransaction();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const queries = [q, categories, accounts];
  const failed = queries.find((item) => item.isError);
  if (failed)
    return (
      <DataState
        title="Não foi possível carregar os lançamentos"
        error
        description={dataErrorMessage(failed.error)}
        onRetry={() => {
          void Promise.all(queries.map((item) => item.refetch()));
        }}
      />
    );
  if (!q.data || !categories.data || !accounts.data)
    return <DataState title="Carregando lançamentos…" loading />;
  const options = (rows: Record<string, unknown>[]) =>
    rows
      .filter((row) => row.is_active)
      .map((row) => ({ value: String(row.id), label: String(row.name) }));
  const fields: Field[] = [
    { name: 'description', label: 'Descrição', required: true },
    {
      name: 'kind',
      label: 'Tipo',
      kind: 'select',
      required: true,
      options: incomeOnly
        ? [{ value: 'income', label: 'Receita' }]
        : [
            { value: 'income', label: 'Receita' },
            { value: 'expense', label: 'Despesa' },
          ],
    },
    {
      name: 'amount_cents',
      label: 'Valor (R$)',
      placeholder: '0,00',
      required: true,
    },
    {
      name: 'category_id',
      label: 'Categoria',
      kind: 'select',
      required: true,
      options: categories.data
        .filter((r) => r.is_active && (!incomeOnly || r.kind === 'income'))
        .map((r) => ({
          value: String(r.id),
          label: `${r.name} (${r.kind === 'income' ? 'receita' : 'despesa'})`,
        })),
    },
    {
      name: 'account_id',
      label: 'Conta',
      kind: 'select',
      required: true,
      options: options(accounts.data),
    },
    {
      name: 'occurred_on',
      label: 'Data da ocorrência',
      kind: 'date',
      required: true,
    },
    { name: 'due_date', label: 'Vencimento', kind: 'date', required: true },
    {
      name: 'payment_method',
      label: 'Forma de pagamento',
      kind: 'select',
      required: true,
      options: [
        { value: 'pix', label: 'Pix' },
        { value: 'cash', label: 'Dinheiro' },
        { value: 'debit', label: 'Débito' },
        { value: 'bank_transfer', label: 'Transferência' },
      ],
    },
    {
      name: 'status',
      label: 'Situação',
      kind: 'select',
      required: true,
      options: [
        { value: 'pending', label: 'Previsto' },
        { value: 'settled', label: 'Recebido / pago' },
      ],
    },
    {
      name: 'settled_on',
      label: 'Data efetiva (somente quando recebido / pago)',
      kind: 'date',
    },
  ];
  return (
    <>
      <FinancialWorkspace
        title={incomeOnly ? 'Receitas' : 'Movimentações'}
        eyebrow="SEU CAIXA, COM CLAREZA"
        description="Registre entradas e saídas previstas ou já liquidadas."
        action={incomeOnly ? 'Nova receita' : 'Nova movimentação'}
        icon={<ArrowDownUp />}
        fields={fields}
        onSave={async (values) => {
          await mutation.mutateAsync({ values, key });
          setKey(crypto.randomUUID());
        }}
        rows={q.data
          .filter((r) => !incomeOnly || r.kind === 'income')
          .map((r) => ({
            title: r.description,
            detail: `${r.due_date.split('-').reverse().join('/')} · ${r.status === 'pending' ? 'Previsto' : r.status === 'settled' ? 'Liquidado' : r.status === 'cancelled' ? 'Cancelado' : 'No cartão'}`,
            value: formatMoney(r.amount_cents),
          }))}
        note="Receitas previstas não alteram o caixa. Escolha a categoria correspondente ao tipo do lançamento."
      />
      {q.data
        .filter((row) => !incomeOnly || row.kind === 'income')
        .map((row) => (
          <RecordEditor key={row.id} table="transactions" row={row} />
        ))}
      <p className="page-footnote">
        <Link to="/contas">Gerenciar contas e saldo inicial</Link>
      </p>
    </>
  );
}
