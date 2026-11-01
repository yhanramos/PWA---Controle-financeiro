import { useState, type FormEvent } from 'react';
import { Repeat2 } from 'lucide-react';
import { ZodError } from 'zod';
import {
  FinancialWorkspace,
  type Field,
} from '@/features/shared/financial-workspace';
import { useFinancialRows } from '@/features/shared/financial-data';
import { useRecurrenceAction } from './recurrence-data';
import { DataState } from '@/components/shared/data-state';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/financial-money';
import { dataErrorMessage } from '@/services/data-error';
function RecurrenceActions({ row }: { row: Record<string, unknown> }) {
  const action = useRecurrenceAction();
  const [mode, setMode] = useState<'generate' | 'edit' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const v = new FormData(event.currentTarget);
    setError('');
    setMessage('');
    try {
      const result =
        mode === 'generate'
          ? await action.mutateAsync({
              kind: 'generate',
              id: String(row.id),
              until: String(v.get('until')),
            })
          : await action.mutateAsync({
              kind: 'edit',
              id: String(row.id),
              version: String(row.updated_at),
              description: String(v.get('description')),
              amount: String(v.get('amount')),
              end: String(v.get('end')),
              active: v.get('active') === 'yes',
            });
      setMessage(
        mode === 'generate'
          ? `${result} ocorrências criadas.`
          : 'Recorrência atualizada.',
      );
      setMode(null);
    } catch (err) {
      setError(
        err instanceof ZodError
          ? err.issues.map((i) => i.message).join(' ')
          : dataErrorMessage(err),
      );
    }
  }
  const cents = BigInt(Number(row.amount_cents));
  const amount = `${cents / 100n},${(cents % 100n).toString().padStart(2, '0')}`;
  return (
    <Card>
      <h2>{String(row.description)}</h2>
      <p className="muted">
        {row.is_active ? 'Ativa' : 'Encerrada'} · de {String(row.starts_on)} até{' '}
        {row.ends_on ? String(row.ends_on) : 'sem data final'}
      </p>
      <div className="finance-form-actions">
        <Button
          variant="outline"
          disabled={action.isPending || !row.is_active}
          onClick={() => setMode('generate')}
        >
          Gerar ocorrências
        </Button>
        <Button
          variant="outline"
          disabled={action.isPending}
          onClick={() => setMode('edit')}
        >
          Editar / encerrar
        </Button>
      </div>
      {mode && (
        <form className="finance-form" onSubmit={submit}>
          {mode === 'generate' ? (
            <label>
              Gerar até
              <input name="until" type="date" required />
              <span>
                Máximo de dois anos à frente. Ocorrências existentes não serão
                duplicadas.
              </span>
            </label>
          ) : (
            <>
              <label>
                Descrição
                <input
                  name="description"
                  required
                  maxLength={200}
                  defaultValue={String(row.description)}
                />
              </label>
              <label>
                Valor das próximas ocorrências (R$)
                <input name="amount" defaultValue={amount} required />
              </label>
              <label>
                Data final
                <input
                  name="end"
                  type="date"
                  defaultValue={String(row.ends_on ?? '')}
                />
              </label>
              <label>
                Situação
                <select
                  name="active"
                  defaultValue={row.is_active ? 'yes' : 'no'}
                >
                  <option value="yes">Ativa</option>
                  <option value="no">Encerrada</option>
                </select>
              </label>
              <p>
                Alterações valem para ocorrências ainda não geradas. Encerrar
                não cancela lançamentos existentes.
              </p>
            </>
          )}
          <div className="finance-form-actions">
            <Button type="submit" disabled={action.isPending}>
              {action.isPending ? 'Salvando…' : 'Confirmar'}
            </Button>
            <Button
              variant="ghost"
              disabled={action.isPending}
              onClick={() => setMode(null)}
            >
              Voltar
            </Button>
          </div>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </Card>
  );
}
export function RecurringPage() {
  const query = useFinancialRows('recurring_transactions');
  const categories = useFinancialRows('categories');
  const accounts = useFinancialRows('accounts');
  const cards = useFinancialRows('credit_cards');
  const action = useRecurrenceAction();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const failed = [query, categories, accounts, cards].find((q) => q.isError);
  if (failed)
    return (
      <DataState
        title="Não foi possível carregar as recorrências"
        error
        description={dataErrorMessage(failed.error)}
        onRetry={() => {
          void query.refetch();
          void categories.refetch();
          void accounts.refetch();
          void cards.refetch();
        }}
      />
    );
  if (!query.data || !categories.data || !accounts.data || !cards.data)
    return <DataState title="Carregando recorrências…" loading />;
  const fields: Field[] = [
    { name: 'description', label: 'Descrição', required: true },
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
    { name: 'amount_cents', label: 'Valor (R$)', required: true },
    {
      name: 'category_id',
      label: 'Categoria',
      kind: 'select',
      required: true,
      options: categories.data
        .filter((c) => c.is_active)
        .map((c) => ({
          value: String(c.id),
          label: `${c.name} (${c.kind === 'income' ? 'receita' : 'despesa'})`,
        })),
    },
    {
      name: 'account_id',
      label: 'Conta (para pagamentos fora do crédito)',
      kind: 'select',
      options: accounts.data
        .filter((a) => a.is_active)
        .map((a) => ({ value: String(a.id), label: String(a.name) })),
    },
    {
      name: 'credit_card_id',
      label: 'Cartão (para despesas no crédito)',
      kind: 'select',
      options: cards.data
        .filter((c) => c.is_active)
        .map((c) => ({ value: String(c.id), label: String(c.name) })),
    },
    {
      name: 'payment_method',
      label: 'Forma de pagamento',
      kind: 'select',
      required: true,
      options: [
        { value: 'credit', label: 'Cartão de crédito' },
        { value: 'pix', label: 'Pix' },
        { value: 'cash', label: 'Dinheiro' },
        { value: 'debit', label: 'Débito' },
        { value: 'bank_transfer', label: 'Transferência' },
      ],
    },
    {
      name: 'interval_unit',
      label: 'Periodicidade',
      kind: 'select',
      required: true,
      options: [
        { value: 'day', label: 'Dias' },
        { value: 'week', label: 'Semanas' },
        { value: 'month', label: 'Meses' },
        { value: 'year', label: 'Anos' },
      ],
    },
    {
      name: 'interval_count',
      label: 'Repetir a cada (quantidade)',
      kind: 'number',
      required: true,
    },
    {
      name: 'starts_on',
      label: 'Primeira ocorrência',
      kind: 'date',
      required: true,
    },
    { name: 'ends_on', label: 'Fim (opcional)', kind: 'date' },
  ];
  return (
    <div className="page-stack">
      <FinancialWorkspace
        title="Recorrências"
        eyebrow="SUA ROTINA FINANCEIRA"
        description="Programe receitas e despesas e gere os próximos lançamentos."
        action="Nova recorrência"
        icon={<Repeat2 />}
        fields={fields}
        onSave={async (values) => {
          await action.mutateAsync({ kind: 'create', key, values });
          setKey(crypto.randomUUID());
        }}
        rows={query.data.map((r) => ({
          title: String(r.description),
          detail: `A cada ${r.interval_count} ${r.interval_unit === 'month' ? 'meses' : r.interval_unit === 'week' ? 'semanas' : r.interval_unit === 'year' ? 'anos' : 'dias'}`,
          value: formatMoney(Number(r.amount_cents)),
        }))}
        note="No crédito, despesas entram nas faturas conforme o fechamento do cartão. As demais ocorrências são previstas. Nenhum pagamento ou recebimento é realizado automaticamente."
      />
      {query.data.map((row) => (
        <RecurrenceActions key={String(row.id)} row={row} />
      ))}
    </div>
  );
}
