import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useEditRecord, type EditableTable } from './record-edit-data';
import { useFinancialRows } from './financial-data';
import { moneyInput } from '@/lib/financial-money';
import { dataErrorMessage } from '@/services/data-error';
import type { Json } from '@/lib/supabase/database.types';
type EditorField = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  nullable?: boolean;
  max?: number;
  money?: boolean;
  positive?: boolean;
};
function moneyText(value: unknown) {
  if (value === null) return '';
  const n = BigInt(Number(value));
  return `${n < 0 ? '-' : ''}${(n < 0 ? -n : n) / 100n},${((n < 0 ? -n : n) % 100n).toString().padStart(2, '0')}`;
}
export function RecordEditor({
  table,
  row: latest,
}: {
  table: EditableTable;
  row: Record<string, unknown>;
}) {
  const [snapshot, setSnapshot] = useState(latest);
  const mutation = useEditRecord(table);
  const categories = useFinancialRows('categories', table === 'transactions');
  const accounts = useFinancialRows('accounts', table === 'transactions');
  const [mode, setMode] = useState<'edit' | 'toggle' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const row = mode ? snapshot : latest;
  const transaction = table === 'transactions';
  const credit = row.payment_method === 'credit';
  const unavailable =
    transaction && (!categories.data || (!credit && !accounts.data));
  const fields: EditorField[] = transaction
    ? [
        { name: 'description', label: 'Descrição', max: 200 },
        {
          name: 'amount_cents',
          label: 'Valor (R$)',
          money: true,
          positive: true,
        },
        {
          name: 'category_id',
          label: 'Categoria',
          options:
            categories.data
              ?.filter(
                (c) =>
                  c.kind === row.kind &&
                  (c.is_active || c.id === row.category_id),
              )
              .map((c) => ({ value: String(c.id), label: String(c.name) })) ??
            [],
        },
        { name: 'occurred_on', label: 'Ocorrência', type: 'date' },
        { name: 'notes', label: 'Observações', nullable: true, max: 2000 },
        ...(!credit
          ? [
              {
                name: 'account_id',
                label: 'Conta',
                options:
                  accounts.data
                    ?.filter((a) => a.is_active || a.id === row.account_id)
                    .map((a) => ({
                      value: String(a.id),
                      label: String(a.name),
                    })) ?? [],
              },
              { name: 'due_date', label: 'Vencimento', type: 'date' },
              {
                name: 'status',
                label: 'Situação',
                options: [
                  { value: 'pending', label: 'Previsto' },
                  { value: 'settled', label: 'Liquidado' },
                ],
              },
              {
                name: 'settled_on',
                label: 'Data efetiva (somente se liquidado)',
                type: 'date',
                nullable: true,
              },
            ]
          : []),
      ]
    : [
        { name: 'name', label: 'Nome', max: table === 'categories' ? 80 : 100 },
        ...(table === 'categories'
          ? [{ name: 'color', label: 'Cor', type: 'color' }]
          : [
              {
                name: 'institution',
                label: 'Instituição',
                max: 100,
                nullable: table === 'accounts',
              },
            ]),
        ...(table === 'accounts'
          ? [
              {
                name: 'kind',
                label: 'Tipo',
                options: [
                  { value: 'checking', label: 'Corrente' },
                  { value: 'savings', label: 'Poupança' },
                  { value: 'cash', label: 'Dinheiro' },
                  { value: 'other', label: 'Outra' },
                ],
              },
              {
                name: 'opening_balance_cents',
                label: 'Saldo inicial (R$)',
                money: true,
              },
              {
                name: 'opening_balance_date',
                label: 'Data do saldo inicial',
                type: 'date',
              },
            ]
          : []),
        ...(table === 'credit_cards'
          ? [
              {
                name: 'closing_day',
                label: 'Dia do fechamento',
                type: 'number',
              },
              { name: 'due_day', label: 'Dia do vencimento', type: 'number' },
              {
                name: 'credit_limit_cents',
                label: 'Limite (R$)',
                money: true,
                nullable: true,
              },
              {
                name: 'allows_early_settlement',
                label: 'Permite antecipar?',
                nullable: true,
                options: [
                  { value: '', label: 'Não informado' },
                  { value: 'true', label: 'Sim' },
                  { value: 'false', label: 'Não' },
                ],
              },
            ]
          : []),
      ];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const changes: Record<string, Json> = {};
      if (mode === 'toggle') {
        if (transaction) changes.status = 'cancelled';
        else changes.is_active = !row.is_active;
      } else {
        const data = new FormData(event.currentTarget);
        for (const field of fields) {
          const value = String(data.get(field.name) ?? '').trim();
          if (field.nullable && !value) {
            changes[field.name] = null;
            continue;
          }
          if (field.money) {
            const amount = moneyInput.parse(value);
            if (
              (field.positive && amount <= 0) ||
              (field.name === 'credit_limit_cents' && amount < 0)
            )
              throw Error('Informe um valor válido.');
            changes[field.name] = amount;
          } else if (field.type === 'number')
            changes[field.name] = z.coerce
              .number()
              .int()
              .min(1)
              .max(31)
              .parse(value);
          else if (field.type === 'date')
            changes[field.name] = z.iso.date().parse(value);
          else if (field.name === 'allows_early_settlement')
            changes[field.name] = value === 'true';
          else if (field.options) {
            changes[field.name] = z
              .string()
              .refine(
                (v) => field.options?.some((o) => o.value === v),
                'Seleção inválida.',
              )
              .parse(value);
          } else if (field.type === 'color')
            changes[field.name] = z
              .string()
              .regex(/^#[0-9a-f]{6}$/i)
              .parse(value);
          else
            changes[field.name] = z
              .string()
              .min(1)
              .max(field.max ?? 200)
              .parse(value);
        }
        if (changes.status === 'pending') changes.settled_on = null;
      }
      await mutation.mutateAsync({
        id: String(row.id),
        version: String(row.updated_at),
        changes,
      });
      setMode(null);
      setSuccess('Alteração salva.');
    } catch (err) {
      setError(
        err instanceof z.ZodError
          ? err.issues.map((i) => i.message).join(' ')
          : err instanceof Error && err.message === 'Informe um valor válido.'
            ? err.message
            : dataErrorMessage(err),
      );
    }
  }
  return (
    <Card>
      <h2>{String(row.name ?? row.description)}</h2>
      <div className="finance-form-actions">
        <Button
          variant="outline"
          disabled={
            mutation.isPending || (transaction && row.status === 'cancelled')
          }
          onClick={() => {
            setSnapshot(latest);
            setMode('edit');
            setError('');
            setSuccess('');
          }}
        >
          Editar
        </Button>
        <Button
          variant="ghost"
          disabled={
            mutation.isPending || (transaction && row.status === 'cancelled')
          }
          onClick={() => {
            setSnapshot(latest);
            setMode('toggle');
            setError('');
            setSuccess('');
          }}
        >
          {transaction
            ? 'Cancelar lançamento'
            : row.is_active
              ? 'Desativar'
              : 'Ativar'}
        </Button>
        <span className="badge">
          {transaction
            ? row.status === 'cancelled'
              ? 'Cancelado'
              : credit
                ? 'No crédito'
                : row.status === 'settled'
                  ? 'Liquidado'
                  : 'Previsto'
            : row.is_active
              ? 'Ativo'
              : 'Inativo'}
        </span>
      </div>
      {mode && (
        <form className="finance-form" onSubmit={submit}>
          {mode === 'toggle' ? (
            <p>
              {transaction
                ? 'Confirmar cancelamento? O histórico será preservado. Compras em faturas com pagamentos exigem estorno prévio.'
                : `Confirmar ${row.is_active ? 'desativação' : 'ativação'}? O histórico dos lançamentos será preservado.`}
            </p>
          ) : (
            fields.map((f) => (
              <label key={f.name}>
                {f.label}
                {f.options ? (
                  <select
                    name={f.name}
                    defaultValue={String(row[f.name] ?? '')}
                    required={!f.nullable}
                  >
                    {!f.options.some((o) => o.value === '') && (
                      <option value="">Selecione</option>
                    )}
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={f.name}
                    type={f.type ?? 'text'}
                    maxLength={f.max}
                    defaultValue={
                      f.money
                        ? moneyText(row[f.name])
                        : String(row[f.name] ?? '')
                    }
                    required={!f.nullable}
                  />
                )}
              </label>
            ))
          )}
          {mode === 'edit' && unavailable && (
            <p role="status">
              Carregue as categorias e contas antes de salvar.{' '}
              <Button
                onClick={() => {
                  void categories.refetch();
                  void accounts.refetch();
                }}
              >
                Tentar novamente
              </Button>
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="finance-form-actions">
            <Button
              type="submit"
              disabled={mutation.isPending || (mode === 'edit' && unavailable)}
            >
              {mutation.isPending ? 'Salvando…' : 'Confirmar'}
            </Button>
            <Button
              disabled={mutation.isPending}
              variant="ghost"
              onClick={() => setMode(null)}
            >
              Voltar
            </Button>
          </div>
        </form>
      )}
      {success && <p role="status">{success}</p>}
    </Card>
  );
}
