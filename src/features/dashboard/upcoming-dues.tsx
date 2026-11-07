import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarDays } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/financial-money';
import { monthLabel } from '@/lib/utils/calendar';
import { dataErrorMessage } from '@/services/data-error';
import { useMonthlyIndicators } from './use-monthly-indicators';

const labels = {
  income: 'A receber',
  expense: 'A pagar',
  invoice: 'Fatura em aberto',
};

export function UpcomingDues({ month }: { month: string }) {
  const query = useMonthlyIndicators(month);
  const [limit, setLimit] = useState(8);
  const data = query.data;
  return (
    <Card className="upcoming-dues" aria-busy={query.isFetching}>
      <header className="panel-heading">
        <div>
          <h2>Próximos vencimentos</h2>
          <p>Pendências de {monthLabel(month)}</p>
        </div>
        <CalendarDays size={20} />
      </header>
      {query.isError ? (
        <div role="alert">
          <p>{dataErrorMessage(query.error)}</p>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : !data ? (
        <p role="status">Carregando vencimentos…</p>
      ) : (
        <>
          {data.dueItems.length === 0 ? (
            <div className="simple-empty">
              <CalendarDays size={25} />
              <div>
                <h3>Sem pendências neste mês</h3>
                <p>Receitas, despesas e faturas em aberto aparecerão aqui.</p>
              </div>
            </div>
          ) : (
            <ul className="due-list">
              {data.dueItems.slice(0, limit).map((item) => (
                <li key={item.id}>
                  <div className="due-description">
                    <Link
                      to={
                        item.kind === 'invoice' ? '/faturas' : '/movimentacoes'
                      }
                    >
                      {item.description}
                    </Link>
                    <span>
                      {labels[item.kind]} ·{' '}
                      <time dateTime={item.date}>
                        {item.date.split('-').reverse().join('/')}
                      </time>
                    </span>
                    <span
                      className={
                        item.date < data.today ? 'due-overdue' : 'due-status'
                      }
                    >
                      {item.date < data.today
                        ? 'Em atraso'
                        : item.date === data.today
                          ? 'Vence hoje'
                          : 'A vencer'}
                    </span>
                  </div>
                  <strong
                    className={
                      item.kind === 'income' ? 'due-income' : undefined
                    }
                  >
                    {formatMoney(item.amount)}
                  </strong>
                </li>
              ))}
            </ul>
          )}
          {data.dueItems.length > limit && (
            <Button
              variant="outline"
              onClick={() => setLimit((value) => value + 8)}
            >
              Mostrar mais ({data.dueItems.length - limit})
            </Button>
          )}
          {query.isFetching && <p role="status">Atualizando vencimentos…</p>}
        </>
      )}
      <p className="financial-chart-note">
        Situação atual das pendências do mês, incluindo atrasados desse período.
        Parcelas e compras no crédito estão agrupadas na fatura. Recorrências
        ainda não geradas não aparecem.
      </p>
    </Card>
  );
}
