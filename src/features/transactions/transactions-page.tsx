import { TransactionList } from './transaction-list';
import { useRef, useState } from 'react';
import { useRecurrenceAction } from '@/features/recurring';
import { monthlyRecurrenceRequest } from './monthly-recurrence';
import { ArrowDownUp } from 'lucide-react';
import { Link } from 'react-router';
import {
  FinancialWorkspace,
  type Field,
} from '@/features/shared/financial-workspace';
import { useFinancialRows } from '@/features/shared/financial-data';
import { DataState } from '@/components/shared/data-state';
import { DataError, dataErrorMessage } from '@/services/data-error';
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
  const recurrence = useRecurrenceAction();
  const rules = useFinancialRows('recurring_transactions');
  const pendingRecurrence = useRef<{
    key: string;
    signature: string;
    id: string;
  } | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  const queries = [q, categories, accounts, rules];
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
  if (!q.data || !categories.data || !accounts.data || !rules.data)
    return <DataState title="Carregando lançamentos…" loading />;
  const visibleRows = q.data.filter(
    (row) => !incomeOnly || row.kind === 'income',
  );
  const options = (rows: Record<string, unknown>[]) =>
    rows
      .filter((row) => row.is_active)
      .map((row) => ({ value: String(row.id), label: String(row.name) }));
  const fields: Field[] = [
    { name: 'description', label: 'Descrição', required: true },
    {
      name: 'repeat',
      label: 'Repetir pagamento / recebimento',
      kind: 'select',
      defaultValue: 'none',
      required: true,
      options: [
        { value: 'none', label: 'Não repetir' },
        { value: 'monthly', label: 'Todo mês na data informada' },
      ],
    },
    {
      name: 'kind',
      label: 'Tipo',
      kind: 'select',
      required: true,
      defaultValue: incomeOnly ? 'income' : '',
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
      showAllWhen: [
        { field: 'repeat', value: 'none' },
        { field: 'kind', value: 'expense' },
      ],
    },
    {
      name: 'received_on',
      label: 'Data do recebimento / previsão',
      kind: 'date',
      required: true,
      showWhen: { field: 'kind', value: 'income' },
    },
    {
      name: 'due_date',
      label: 'Vencimento',
      kind: 'date',
      required: true,
      showWhen: { field: 'kind', value: 'expense' },
    },
    {
      name: 'ends_on',
      label: 'Data final da repetição (opcional)',
      kind: 'date',
      showWhen: { field: 'repeat', value: 'monthly' },
    },
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
      showWhen: { field: 'repeat', value: 'none' },
      options: [
        { value: 'pending', label: 'Previsto' },
        { value: 'settled', label: 'Recebido / pago' },
      ],
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
          const signature = JSON.stringify(values);
          if (
            pendingRecurrence.current &&
            pendingRecurrence.current.signature !== signature
          )
            throw new DataError(
              'conflict',
              'A recorrência já foi criada. Repita o envio com os mesmos dados ou gerencie-a em Recorrências.',
            );
          if (values.repeat === 'monthly') {
            let request;
            try {
              request = monthlyRecurrenceRequest(values);
            } catch (error) {
              throw new DataError(
                'invalid',
                error instanceof Error
                  ? error.message
                  : 'Confira o vencimento.',
              );
            }
            const result =
              pendingRecurrence.current?.id ??
              (await recurrence.mutateAsync({
                kind: 'create',
                key,
                values: request.values,
              }));
            if (typeof result !== 'string')
              throw new DataError(
                'schema',
                'Não foi possível identificar a recorrência.',
              );
            pendingRecurrence.current = { key, signature, id: result };
            try {
              await recurrence.mutateAsync({
                kind: 'generate',
                id: result,
                until: request.until,
              });
            } catch {
              throw new DataError(
                'unavailable',
                'A recorrência foi salva, mas não foi possível confirmar os lançamentos. Tente salvar novamente com os mesmos dados; eles não serão duplicados. Você também pode gerar os lançamentos em Recorrências.',
              );
            }
            pendingRecurrence.current = null;
          } else {
            await mutation.mutateAsync({ values, key });
          }
          setKey(crypto.randomUUID());
        }}
        formNote="Receitas usam a data do recebimento ou da previsão; despesas usam o vencimento. Na repetição mensal, essa data define o dia dos próximos 12 lançamentos previstos. Para despesas avulsas pagas, a data da ocorrência é a data do pagamento."
        records={
          visibleRows.length ? (
            <TransactionList rows={visibleRows} rules={rules.data} />
          ) : undefined
        }
        note="Receitas previstas não alteram o caixa. Escolha a categoria correspondente ao tipo do lançamento."
      />
      <p className="page-footnote">
        <Link to="/contas">Gerenciar contas e saldo inicial</Link>
        {' · '}
        <Link to="/recorrencias">Gerenciar pagamentos recorrentes</Link>
      </p>
    </>
  );
}
