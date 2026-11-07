import { Link } from 'react-router';
import { Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/financial-money';
import { dataErrorMessage } from '@/services/data-error';
import { useCashBalance } from './use-cash-balance';

export function CashBalanceCard() {
  const query = useCashBalance();
  const data = query.data;
  return (
    <Card
      className="metric-card cash-balance"
      aria-label="Saldo total antes das despesas"
      aria-busy={query.isFetching}
    >
      <div className="metric-header">
        <span>Saldo total</span>
        <span className="metric-icon metric-icon--violet">
          <Wallet size={19} />
        </span>
      </div>
      {query.isError ? (
        <div role="alert">
          <strong className="metric-value" aria-label="Saldo indisponível">
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
      ) : !data ? (
        <div role="status">
          <strong className="metric-value">—</strong>
          <p>Carregando saldo…</p>
        </div>
      ) : (
        <>
          <strong className="metric-value" aria-live="polite">
            {formatMoney(data.totalBeforeExpenses)}
          </strong>
          <p>
            Saldos iniciais e receitas recebidas até{' '}
            {data.referenceDate.split('-').reverse().join('/')}. Sem descontar
            despesas ou faturas.
          </p>
          {data.accountCount === 0 ? (
            <p>
              Nenhuma conta com saldo inicial até hoje.{' '}
              <Link to="/contas">Cadastrar conta</Link>
            </p>
          ) : (
            <details className="cash-balance-details">
              <summary>Composição do saldo</summary>
              <dl>
                <div>
                  <dt>Saldos iniciais</dt>
                  <dd>{formatMoney(data.opening)}</dd>
                </div>
                <div>
                  <dt>+ Receitas recebidas</dt>
                  <dd>{formatMoney(data.income)}</dd>
                </div>
              </dl>
            </details>
          )}
          <span className="metric-status">
            {query.isFetching
              ? 'Atualizando…'
              : 'Acumulado até hoje · independente do mês selecionado'}
          </span>
        </>
      )}
    </Card>
  );
}
