import { useState, type FormEvent } from 'react';
import { useInvoices, useInvoiceAction } from './invoice-data';
import { useFinancialRows } from '@/features/shared/financial-data';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataState } from '@/components/shared/data-state';
import { dataErrorMessage } from '@/services/data-error';
import { formatMoney, positiveMoneyInput } from '@/lib/financial-money';
export function InvoicesPage() {
  const q = useInvoices();
  const cards = useFinancialRows('credit_cards');
  const accounts = useFinancialRows('accounts');
  const action = useInvoiceAction();
  const [card, setCard] = useState('');
  const [month, setMonth] = useState('');
  const [selected, setSelected] = useState('');
  const [reversing, setReversing] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function pay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setError('');
    setSuccess('');
    try {
      await action.mutateAsync({
        kind: 'pay',
        key,
        invoice: selected,
        account: String(values.get('account')),
        amount: positiveMoneyInput.parse(values.get('amount')),
        date: String(values.get('date')),
      });
      setSelected('');
      setKey(crypto.randomUUID());
      setSuccess('Pagamento registrado.');
    } catch (err) {
      setError(dataErrorMessage(err));
    }
  }
  async function reverse(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    setError('');
    setSuccess('');
    try {
      await action.mutateAsync({
        kind: 'reverse',
        payment: reversing,
        reason: String(values.get('reason')),
      });
      setReversing('');
      setSuccess('Pagamento estornado.');
    } catch (err) {
      setError(dataErrorMessage(err));
    }
  }
  const failed = [q, cards, accounts].find((r) => r.isError);
  if (failed)
    return (
      <DataState
        title="Não foi possível carregar as faturas"
        error
        description={dataErrorMessage(failed.error)}
        onRetry={() => {
          void q.refetch();
          void cards.refetch();
          void accounts.refetch();
        }}
      />
    );
  if (!q.data || !cards.data || !accounts.data)
    return <DataState title="Carregando faturas…" loading />;
  const rows = q.data.filter(
    (i) =>
      (!card || i.credit_card_id === card) &&
      (!month || i.reference_month.startsWith(month)),
  );
  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">COMPROMISSOS DO CARTÃO</span>
        <h1>Faturas</h1>
        <p>
          Consulte os itens e registre pagamentos sem duplicar suas despesas.
        </p>
      </header>
      <Card className="finance-filter-panel">
        <label>
          Cartão
          <select value={card} onChange={(e) => setCard(e.target.value)}>
            <option value="">Todos</option>
            {cards.data.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {String(c.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mês de vencimento
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </Card>
      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}
      {!rows.length && (
        <DataState
          title="Nenhuma fatura neste período"
          description="Faturas com compras e parcelas aparecerão aqui."
        />
      )}
      {rows.map((i) => (
        <Card key={i.id}>
          <h2>
            {String(
              cards.data.find((c) => c.id === i.credit_card_id)?.name ??
                'Cartão',
            )}{' '}
            · {i.reference_month.slice(0, 7)}
          </h2>
          <p className="muted">
            Fecha em {i.closing_date} · vence em {i.due_date}
          </p>
          <div className="finance-summary-grid">
            <div>Total: {formatMoney(i.total)}</div>
            <div>Pago: {formatMoney(i.paid)}</div>
            <div>Em aberto: {formatMoney(i.outstanding)}</div>
          </div>
          <Button
            disabled={
              action.isPending || i.status === 'cancelled' || i.outstanding <= 0
            }
            onClick={() => {
              setSelected(i.id);
              setKey(crypto.randomUUID());
              setError('');
            }}
          >
            Registrar pagamento
          </Button>
          {selected === i.id && (
            <form className="finance-form" onSubmit={pay}>
              <label>
                Conta
                <select name="account" required>
                  {accounts.data
                    .filter((a) => a.is_active)
                    .map((a) => (
                      <option key={String(a.id)} value={String(a.id)}>
                        {String(a.name)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Valor (R$)
                <input name="amount" required placeholder="0,00" />
              </label>
              <label>
                Data do pagamento
                <input type="date" name="date" required />
              </label>
              <div className="finance-form-actions">
                <Button type="submit" disabled={action.isPending}>
                  Confirmar pagamento
                </Button>
                <Button
                  disabled={action.isPending}
                  variant="ghost"
                  onClick={() => setSelected('')}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
          <ul>
            {i.payments.map((p) => (
              <li key={p.id}>
                {p.paid_on} · {formatMoney(p.amount_cents)} ·{' '}
                {p.status === 'confirmed' ? 'Confirmado' : 'Estornado'}
                {p.status === 'confirmed' && (
                  <Button
                    variant="ghost"
                    disabled={action.isPending}
                    onClick={() => setReversing(p.id)}
                  >
                    Estornar
                  </Button>
                )}
                {reversing === p.id && (
                  <form className="finance-form" onSubmit={reverse}>
                    <label>
                      Motivo do estorno
                      <input name="reason" required maxLength={500} />
                    </label>
                    <Button type="submit" disabled={action.isPending}>
                      Confirmar estorno
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={action.isPending}
                      onClick={() => setReversing('')}
                    >
                      Cancelar
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
