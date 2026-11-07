import { CreditCard, Wallet } from 'lucide-react';
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
      title: data?.currentInvoices
        ? 'Faturas do ciclo atual'
        : 'Total das faturas',
      subtitle: data?.currentInvoices
        ? 'Compras e parcelas do ciclo em formação'
        : 'Compras e parcelas, após descontos · vencimentos do mês',
      icon: CreditCard,
      tone: 'blue',
      value: data?.currentInvoices?.total ?? data?.invoiceTotal,
      count: data?.currentInvoices?.count ?? data?.invoiceCount,
      empty: data?.currentInvoices
        ? 'Nenhuma fatura registrada para o ciclo atual.'
        : 'Nenhuma fatura com vencimento neste mês.',
    },
    {
      title: 'Despesas totais do mês',
      subtitle:
        'Despesas avulsas, recorrências, compras e parcelas · pagas e pendentes',
      icon: Wallet,
      tone: 'orange',
      value: data?.totalExpenses.total,
      count: data?.totalExpenses.total === 0 ? 0 : undefined,
      empty: 'Nenhuma despesa registrada neste período.',
      isTotal: true,
    },
  ];
  return (
    <>
      {indicators.map(
        ({
          title,
          subtitle,
          icon: Icon,
          tone,
          value,
          count,
          empty,
          isTotal,
        }) => (
          <Card
            key={title}
            className={`metric-card monthly-indicator${isTotal ? ' monthly-expense-total' : ''}`}
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
                {isTotal && data && (
                  <>
                    <dl className="expense-total-composition">
                      <div>
                        <dt>Despesas fora do cartão, incluindo recorrências</dt>
                        <dd>{formatMoney(data.totalExpenses.outsideCredit)}</dd>
                      </div>
                      <div>
                        <dt>
                          {data.currentInvoices
                            ? 'Compras e parcelas nas faturas do ciclo atual'
                            : 'Compras e parcelas nas faturas do mês'}
                        </dt>
                        <dd>{formatMoney(data.totalExpenses.invoices)}</dd>
                      </div>
                    </dl>
                    {data.totalExpenses.upcomingRecurring > 0 && (
                      <p>
                        Inclui{' '}
                        {formatMoney(data.totalExpenses.upcomingRecurring)} de
                        próximas recorrências com vencimento futuro, uma por
                        recorrência sem parcela neste mês.
                      </p>
                    )}
                    <p>
                      Inclui despesas já pagas. Pagamentos de faturas não são
                      somados novamente. Recorrências ainda não geradas não
                      entram no total.
                    </p>
                  </>
                )}
                {tone === 'blue' && data && (
                  <p>
                    Em aberto:{' '}
                    <strong>
                      {formatMoney(
                        data.currentInvoices?.outstanding ??
                          data.invoiceOutstanding,
                      )}
                    </strong>
                  </p>
                )}
                {tone === 'blue' && data?.currentInvoices && (
                  <ul className="current-invoice-dates">
                    {data.currentInvoices.invoices.map((invoice) => (
                      <li key={invoice.id}>
                        <strong>{invoice.name}</strong>
                        <span>
                          Fecha {invoice.closing.split('-').reverse().join('/')}{' '}
                          · vence {invoice.due.split('-').reverse().join('/')}
                        </span>
                      </li>
                    ))}
                  </ul>
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
