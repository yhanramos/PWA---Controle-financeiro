import { Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/financial-money';
import { monthLabel } from '@/lib/utils/calendar';
import { dataErrorMessage } from '@/services/data-error';
import { useCashBalance } from './use-cash-balance';
import { useMonthlyIndicators } from './use-monthly-indicators';
import { calculateRemainingBalance } from './remaining-balance';

export function RemainingBalanceCard({ month }: { month: string }) {
  const cash = useCashBalance();
  const monthly = useMonthlyIndicators(month);
  const busy = cash.isFetching || monthly.isFetching;
  let error: unknown = cash.error ?? monthly.error;
  let result: ReturnType<typeof calculateRemainingBalance> | undefined;
  const expenses = monthly.data?.totalExpenses.pendingOutsideCredit;
  const invoices =
    monthly.data?.currentInvoices?.outstanding ??
    monthly.data?.invoiceOutstanding;
  if (!error && cash.data && expenses !== undefined && invoices !== undefined) {
    try {
      result = calculateRemainingBalance(cash.data.balance, expenses, invoices);
    } catch (cause) {
      error = cause;
    }
  }
  return (
    <Card className="metric-card remaining-balance" aria-busy={busy}>
      <div className="metric-header">
        <span>Saldo após as contas</span>
        <span className="metric-icon metric-icon--green">
          <Wallet size={19} />
        </span>
      </div>
      {error ? (
        <div role="alert">
          <p>{dataErrorMessage(error)}</p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              void cash.refetch();
              void monthly.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : !result || !cash.data ? (
        <p role="status">Calculando saldo após as contas…</p>
      ) : (
        <>
          <strong
            className={`metric-value${result.remaining < 0 ? ' remaining-balance--negative' : ''}`}
            aria-live="polite"
          >
            {formatMoney(result.remaining)}
          </strong>
          <p>
            Quanto sobra do caixa atual após pagar as pendências consideradas em{' '}
            {monthLabel(month)}.
          </p>
          <dl className="expense-total-composition">
            <div>
              <dt>Saldo total antes das despesas</dt>
              <dd>{formatMoney(cash.data.totalBeforeExpenses)}</dd>
            </div>
            <div>
              <dt>− Despesas já pagas</dt>
              <dd>{formatMoney(cash.data.expenses)}</dd>
            </div>
            <div>
              <dt>− Pagamentos de faturas</dt>
              <dd>{formatMoney(cash.data.invoicePayments)}</dd>
            </div>
            <div>
              <dt>− Contas ainda a pagar</dt>
              <dd>{formatMoney(result.pending)}</dd>
            </div>
          </dl>
          <p>
            Inclui despesas, próximas recorrências consideradas no resumo e
            faturas em aberto. Valores já pagos não são descontados novamente;
            receitas previstas não entram.
          </p>
          {result.remaining < 0 && (
            <p className="remaining-balance--negative">
              Faltam {formatMoney(-result.remaining)} para cobrir essas contas
              com o saldo atual.
            </p>
          )}
          {month !== cash.data.referenceDate.slice(0, 7) && (
            <p>
              Comparação com o caixa de hoje; não representa o saldo histórico
              nem a projeção acumulada até esse mês.
            </p>
          )}
          {busy && <p role="status">Atualizando saldo…</p>}
        </>
      )}
    </Card>
  );
}
