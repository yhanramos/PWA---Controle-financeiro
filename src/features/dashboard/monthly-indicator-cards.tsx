import { ArrowDownLeft, ArrowUpRight, CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/financial-money';
import { monthLabel } from '@/lib/utils/calendar';
import { dataErrorMessage } from '@/services/data-error';
import { useMonthlyIndicators } from './use-monthly-indicators';

export function MonthlyIndicatorCards({ month }: { month: string }) {
  const query = useMonthlyIndicators(month);
  const data = query.data;
  const indicators = [
    {
      title: 'Receitas previstas',
      subtitle: 'A receber · vencimentos do mês',
      icon: ArrowDownLeft,
      tone: 'green',
      value: data?.income,
      count: data?.incomeCount,
      empty: 'Nenhuma receita pendente neste mês.',
    },
    {
      title: 'Despesas pendentes',
      subtitle: 'A pagar fora do crédito · vencimentos do mês',
      icon: ArrowUpRight,
      tone: 'orange',
      value: data?.expenses,
      count: data?.expenseCount,
      empty: 'Nenhuma despesa pendente fora do crédito.',
    },
    {
      title: 'Total das faturas',
      subtitle: 'Compras e parcelas, após descontos · vencimentos do mês',
      icon: CreditCard,
      tone: 'blue',
      value: data?.invoiceTotal,
      count: data?.invoiceCount,
      empty: 'Nenhuma fatura com vencimento neste mês.',
    },
  ];
  return (
    <>
      {indicators.map(
        ({ title, subtitle, icon: Icon, tone, value, count, empty }) => (
          <Card
            key={title}
            className="metric-card monthly-indicator"
            aria-label={`${title} · ${monthLabel(month)}`}
            aria-busy={query.isFetching}
          >
            <div className="metric-header">
              <span>{title}</span>
              <span className={`metric-icon metric-icon--${tone}`}>
                <Icon size={19} />
              </span>
            </div>
            {query.isError ? (
              <div role="alert">
                <strong className="metric-value" aria-label="Indisponível">
                  —
                </strong>
                <p>{dataErrorMessage(query.error)}</p>
                <Button
                  variant="outline"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : value === undefined ? (
              <div role="status">
                <strong className="metric-value">—</strong>
                <p>Carregando indicadores…</p>
              </div>
            ) : (
              <>
                <strong className="metric-value" aria-live="polite">
                  {formatMoney(value)}
                </strong>
                <p>{subtitle}</p>
                {count === 0 && <p>{empty}</p>}
                {tone === 'blue' && data && (
                  <p>
                    Em aberto:{' '}
                    <strong>{formatMoney(data.invoiceOutstanding)}</strong>
                  </p>
                )}
                <span className="metric-status">
                  {query.isFetching
                    ? 'Atualizando…'
                    : `${monthLabel(month)} · situação atual`}
                </span>
              </>
            )}
          </Card>
        ),
      )}
    </>
  );
}
