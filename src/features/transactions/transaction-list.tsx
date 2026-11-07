import { ArrowDownUp, ChevronDown, Repeat2 } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/card';
import { RecordEditor } from '@/features/shared/record-editor';
import { formatMoney } from '@/lib/financial-money';
import type { Tables } from '@/lib/supabase/database.types';

const dateLabel = (date: string) => date.split('-').reverse().join('/');
const statusLabel = (status: string) =>
  status === 'pending'
    ? 'Previsto'
    : status === 'settled'
      ? 'Liquidado'
      : status === 'cancelled'
        ? 'Cancelado'
        : 'No cartão';

function frequency(rule: Record<string, unknown> | undefined) {
  if (!rule) return 'Recorrente';
  if (rule.interval_unit === 'month' && rule.interval_count === 1) {
    const day = Number(String(rule.starts_on).slice(8, 10));
    return `Todo dia ${day}${day > 28 ? ' (ou último dia do mês)' : ''}`;
  }
  const units: Record<string, string> = {
    day: 'dia(s)',
    week: 'semana(s)',
    month: 'mês(es)',
    year: 'ano(s)',
  };
  return `A cada ${rule.interval_count} ${units[String(rule.interval_unit)] ?? 'períodos'}`;
}

export function TransactionList({
  rows,
  rules,
}: {
  rows: Tables<'transactions'>[];
  rules: Record<string, unknown>[];
}) {
  const groups = new Map<string, Tables<'transactions'>[]>();
  for (const row of rows) {
    const key = row.recurring_transaction_id
      ? `rule-${row.recurring_transaction_id}`
      : `transaction-${row.id}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return (
    <div className="finance-record-list">
      {[...groups].map(([key, entries]) => {
        const ordered = [...entries].sort(
          (a, b) =>
            a.due_date.localeCompare(b.due_date) || a.id.localeCompare(b.id),
        );
        const pending = ordered.find((row) => row.status === 'pending');
        const representative = pending ?? ordered.at(-1);
        if (!representative) return null;
        const recurring = Boolean(representative.recurring_transaction_id);
        const rule = rules.find(
          (item) => item.id === representative.recurring_transaction_id,
        );
        const Icon = recurring ? Repeat2 : ArrowDownUp;
        return (
          <Card key={key} className="transaction-group">
            <details>
              <summary>
                <Icon size={22} aria-hidden="true" />
                <span className="transaction-group-title">
                  <strong>
                    {recurring && rule
                      ? String(rule.description)
                      : representative.description}
                  </strong>
                  <span>
                    {recurring
                      ? frequency(rule)
                      : `${dateLabel(representative.due_date)} · ${statusLabel(representative.status)}`}
                  </span>
                  {recurring && (
                    <span>
                      {rule?.is_active === false
                        ? 'Recorrência encerrada · '
                        : ''}
                      {pending
                        ? `Próxima pendência: ${dateLabel(pending.due_date)}`
                        : 'Sem ocorrências previstas'}
                    </span>
                  )}
                </span>
                <span className="transaction-group-value">
                  <strong>{formatMoney(representative.amount_cents)}</strong>
                  {recurring && <small>por ocorrência exibida</small>}
                </span>
                <ChevronDown
                  className="transaction-group-chevron"
                  size={18}
                  aria-hidden="true"
                />
              </summary>
              <div className="transaction-group-content">
                {recurring && (
                  <p className="muted">
                    O valor acima corresponde{' '}
                    {pending
                      ? 'à primeira ocorrência pendente'
                      : 'à última ocorrência registrada'}
                    .{' '}
                    <Link to="/recorrencias">
                      Editar ou encerrar recorrência
                    </Link>
                  </p>
                )}
                {ordered.map((row) => (
                  <section key={row.id} className="transaction-occurrence">
                    <p>
                      <strong>{dateLabel(row.due_date)}</strong> ·{' '}
                      {statusLabel(row.status)} ·{' '}
                      {formatMoney(row.amount_cents)}
                    </p>
                    <RecordEditor table="transactions" row={row} />
                  </section>
                ))}
              </div>
            </details>
          </Card>
        );
      })}
    </div>
  );
}
