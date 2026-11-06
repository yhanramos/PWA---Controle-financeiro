import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/financial-money';
import { dataErrorMessage } from '@/services/data-error';
import { monthLabel } from '@/lib/utils/calendar';
import { useForecast } from './use-forecast';

const dateLabel = (date: string) => date.split('-').reverse().join('/');
export function ForecastPanel({ month }: { month: string }) {
  const query = useForecast(month);
  const data = query.data;
  return (
    <Card
      className="forecast-panel forecast-summary"
      aria-busy={query.isFetching}
    >
      <header className="panel-heading">
        <div>
          <h2>Um olhar para o fim do mês</h2>
          <p>Projeção financeira · {monthLabel(month)}</p>
        </div>
        <Sparkles size={20} />
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
      ) : data === null ? (
        <p>
          Projeção disponível para o mês atual e meses futuros. Selecione um
          desses meses para estimar seu saldo.
        </p>
      ) : !data ? (
        <p role="status">Calculando projeção…</p>
      ) : (
        <>
          <strong className="metric-value" aria-live="polite">
            {formatMoney(data.projected)}
          </strong>
          <p>
            Saldo estimado em {dateLabel(data.horizon)}, a partir do caixa de{' '}
            {dateLabel(data.today)}.
          </p>
          <dl className="forecast-details">
            <div>
              <dt>Caixa atual</dt>
              <dd>{formatMoney(data.cash)}</dd>
            </div>
            <div>
              <dt>+ Receitas a receber</dt>
              <dd>{formatMoney(data.income)}</dd>
            </div>
            <div>
              <dt>− Despesas fora do crédito</dt>
              <dd>{formatMoney(data.expenses)}</dd>
            </div>
            <div>
              <dt>− Faturas em aberto</dt>
              <dd>{formatMoney(data.invoices)}</dd>
            </div>
          </dl>
          {!data.hasPending && (
            <p>
              Sem compromissos pendentes até essa data: a projeção coincide com
              o caixa atual.
            </p>
          )}
          {(data.overdueIncome > 0 || data.overdueExpenses > 0) && (
            <p>
              Inclui atrasados: {formatMoney(data.overdueIncome)} a receber e{' '}
              {formatMoney(data.overdueExpenses)} a pagar.
            </p>
          )}
          {data.projected < 0 && (
            <p>
              Os compromissos registrados indicam saldo negativo até essa data.
            </p>
          )}
          <p className="forecast-summary-note">
            Considera a quitação de todos os pendentes até o horizonte,
            inclusive atrasados. Não inclui recorrências ainda não geradas,
            novas compras ou saldos iniciais futuros.
          </p>
          {query.isFetching && <span role="status">Atualizando projeção…</span>}
        </>
      )}
    </Card>
  );
}
