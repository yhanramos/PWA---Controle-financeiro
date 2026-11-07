import { useState, type FormEvent } from 'react';
import { ZodError } from 'zod';
import { Pencil, Ban, Zap, TriangleAlert } from 'lucide-react';
import type { Tables } from '@/lib/supabase/database.types';
import { usePlanAction } from './installment-data';
import { useInvoices } from '@/features/invoices/invoice-data';
import { useFinancialRows } from '@/features/shared/financial-data';
import { moneyInput } from '@/lib/financial-money';
import { dataErrorMessage } from '@/services/data-error';
import { Button } from '@/components/ui/button';
export function PlanActions({
  plan,
  allowsEarly,
}: {
  plan: Tables<'installment_plans'>;
  allowsEarly: boolean;
}) {
  const action = usePlanAction();
  const invoices = useInvoices();
  const accounts = useFinancialRows('accounts');
  const [mode, setMode] = useState<'edit' | 'cancel' | 'anticipate' | null>(
    null,
  );
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setSuccess('');
    try {
      if (mode === 'edit')
        await action.mutateAsync({
          kind: 'edit',
          plan: plan.id,
          version: plan.updated_at,
          description: String(form.get('description')),
          notes: String(form.get('notes')),
        });
      else if (mode === 'cancel')
        await action.mutateAsync({
          kind: 'cancel',
          plan: plan.id,
          version: plan.updated_at,
        });
      else if (mode === 'anticipate')
        await action.mutateAsync({
          kind: 'anticipate',
          key,
          plan: plan.id,
          invoice: String(form.get('invoice')),
          account: String(form.get('account')),
          discount: moneyInput
            .refine((v) => v >= 0, 'O desconto não pode ser negativo.')
            .parse(form.get('discount')),
          date: String(form.get('date')),
        });
      setMode(null);
      setKey(crypto.randomUUID());
      setSuccess('Alteração salva.');
    } catch (err) {
      setError(
        err instanceof ZodError
          ? err.issues.map((i) => i.message).join(' ')
          : dataErrorMessage(err),
      );
    }
  }
  return (
    <div className="installment-actions">
      <div className="finance-form-actions">
        <Button
          disabled={action.isPending || plan.status !== 'active'}
          variant="outline"
          onClick={() => {
            setMode('edit');
            setError('');
          }}
        >
          <Pencil size={16} aria-hidden="true" />
          Editar descrição
        </Button>
        <Button
          disabled={action.isPending || plan.status !== 'active'}
          variant="outline"
          className="installment-cancel-button"
          onClick={() => {
            setMode('cancel');
            setError('');
          }}
        >
          <Ban size={16} aria-hidden="true" />
          Cancelar parcelamento
        </Button>
        {allowsEarly && (
          <Button
            disabled={action.isPending || plan.status !== 'active'}
            onClick={() => {
              setMode('anticipate');
              setError('');
            }}
          >
            <Zap size={16} aria-hidden="true" />
            Antecipar parcelas
          </Button>
        )}
      </div>
      {mode && (
        <form
          className={`finance-form installment-action-panel${mode === 'cancel' ? ' installment-action-panel--cancel' : ''}`}
          onSubmit={submit}
        >
          <h3>
            {mode === 'edit'
              ? 'Editar parcelamento'
              : mode === 'cancel'
                ? 'Cancelar este parcelamento?'
                : 'Antecipar parcelas'}
          </h3>
          {mode === 'edit' && (
            <>
              <label>
                Descrição
                <input
                  name="description"
                  defaultValue={plan.description}
                  maxLength={200}
                  required
                />
              </label>
              <label>
                Observações
                <textarea
                  name="notes"
                  defaultValue={plan.notes ?? ''}
                  maxLength={2000}
                />
              </label>
              <p>Valor, quantidade e datas originais são preservados.</p>
            </>
          )}
          {mode === 'cancel' && (
            <div className="installment-cancel-notice">
              <TriangleAlert size={22} aria-hidden="true" />
              <p>
                Todas as parcelas de <strong>{plan.description}</strong> serão
                canceladas. O histórico será mantido. Faturas com pagamentos
                exigem estorno prévio.
              </p>
            </div>
          )}
          {mode === 'anticipate' && (
            <>
              <p>
                As parcelas futuras elegíveis serão movidas para a fatura
                escolhida e liquidadas na conta informada. Parcelas em faturas
                com pagamentos serão preservadas. O desconto será distribuído
                pelas primeiras parcelas elegíveis.
              </p>
              <label>
                Fatura de destino
                <select
                  name="invoice"
                  required
                  disabled={invoices.isPending || invoices.isError}
                >
                  <option value="">Selecione</option>
                  {invoices.data
                    ?.filter(
                      (i) =>
                        i.credit_card_id === plan.credit_card_id &&
                        i.status === 'open' &&
                        i.paid === 0,
                    )
                    .map((i) => (
                      <option value={i.id} key={i.id}>
                        {i.reference_month.slice(0, 7)} · vence em {i.due_date}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Conta para liquidação
                <select
                  name="account"
                  required
                  disabled={accounts.isPending || accounts.isError}
                >
                  <option value="">Selecione</option>
                  {accounts.data
                    ?.filter((a) => a.is_active)
                    .map((a) => (
                      <option key={String(a.id)} value={String(a.id)}>
                        {String(a.name)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Desconto total (R$)
                <input name="discount" required defaultValue="0,00" />
              </label>
              <label>
                Data da antecipação
                <input name="date" type="date" required />
              </label>
              {(invoices.isError || accounts.isError) && (
                <p role="alert">
                  Não foi possível carregar faturas ou contas.{' '}
                  <Button
                    onClick={() => {
                      void invoices.refetch();
                      void accounts.refetch();
                    }}
                  >
                    Tentar novamente
                  </Button>
                </p>
              )}
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="finance-form-actions">
            <Button
              type="submit"
              disabled={
                action.isPending ||
                (mode === 'anticipate' && (!invoices.data || !accounts.data))
              }
            >
              {action.isPending
                ? 'Salvando…'
                : mode === 'cancel'
                  ? 'Confirmar cancelamento'
                  : 'Salvar alteração'}
            </Button>
            <Button
              variant="ghost"
              disabled={action.isPending}
              onClick={() => setMode(null)}
            >
              {mode === 'cancel' ? 'Manter parcelamento' : 'Voltar'}
            </Button>
          </div>
        </form>
      )}
      {success && <p role="status">{success}</p>}
    </div>
  );
}
