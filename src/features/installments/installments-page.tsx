import { useState } from 'react';
import { PlanActions } from './plan-actions';
import { Layers, ChevronDown, CalendarDays } from 'lucide-react';
import { monthLabel } from '@/lib/utils/calendar';
import {
  FinancialWorkspace,
  type Field,
} from '@/features/shared/financial-workspace';
import { useFinancialRows } from '@/features/shared/financial-data';
import { usePlans, useCreatePlan } from './installment-data';
import { DataState } from '@/components/shared/data-state';
import { Card } from '@/components/ui/card';
import { formatMoney } from '@/lib/financial-money';
import { dataErrorMessage } from '@/services/data-error';
export function InstallmentsPage() {
  const plans = usePlans();
  const cards = useFinancialRows('credit_cards');
  const categories = useFinancialRows('categories');
  const save = useCreatePlan();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const failed = [plans, cards, categories].find((q) => q.isError);
  if (failed)
    return (
      <DataState
        title="Não foi possível carregar os parcelamentos"
        error
        description={dataErrorMessage(failed.error)}
        onRetry={() => {
          void plans.refetch();
          void cards.refetch();
          void categories.refetch();
        }}
      />
    );
  if (!plans.data || !cards.data || !categories.data)
    return <DataState title="Carregando parcelamentos…" loading />;
  const activePlans = plans.data.filter((plan) => plan.status === 'active');
  const fields: Field[] = [
    { name: 'description', label: 'Descrição da compra', required: true },
    {
      name: 'card_id',
      label: 'Cartão',
      kind: 'select',
      required: true,
      options: cards.data
        .filter((c) => c.is_active)
        .map((c) => ({ value: String(c.id), label: String(c.name) })),
    },
    {
      name: 'category_id',
      label: 'Categoria de despesa',
      kind: 'select',
      required: true,
      options: categories.data
        .filter((c) => c.is_active && c.kind === 'expense')
        .map((c) => ({ value: String(c.id), label: String(c.name) })),
    },
    {
      name: 'total',
      label: 'Valor total original (R$)',
      placeholder: '0,00',
      required: true,
    },
    {
      name: 'count',
      label: 'Quantidade original de parcelas',
      kind: 'number',
      required: true,
    },
    {
      name: 'historical',
      label: 'Parcelas já pagas antes do controle (0 para compra nova)',
      kind: 'number',
      required: true,
    },
  ];
  return (
    <div className="page-stack">
      <FinancialWorkspace
        title="Parcelamentos"
        eyebrow="PREVISIBILIDADE PARA OS PRÓXIMOS MESES"
        description="Distribua uma compra em parcelas ou acompanhe um compromisso antigo."
        action="Novo parcelamento"
        icon={<Layers />}
        fields={fields}
        onSave={async (values) => {
          await save.mutateAsync({ key, values });
          setKey(crypto.randomUUID());
        }}
        rows={activePlans.map((p) => ({
          title: p.description,
          detail: `${p.installment_count} parcelas · ${p.paid_before_tracking} pagas antes do controle · ${p.status === 'active' ? 'Ativo' : 'Cancelado'}`,
          value: formatMoney(p.total_amount_cents),
        }))}
        note="A data do cadastro é usada como referência. Fechamento e vencimento são calculados pelo cartão; cadastros no dia do fechamento entram no próximo ciclo. Parcelas já pagas definem a numeração inicial, sem adiar a próxima fatura nem criar saídas de caixa."
      />
      {activePlans.map((p) => (
        <Card key={p.id} className="installment-card">
          <header className="installment-heading">
            <span className="installment-icon">
              <Layers size={22} aria-hidden="true" />
            </span>
            <div className="installment-title">
              <h2>{p.description}</h2>
              <p>
                {String(
                  cards.data.find((card) => card.id === p.credit_card_id)
                    ?.name ?? 'Cartão',
                )}{' '}
                · {p.installment_count} parcelas
              </p>
            </div>
            <span
              className={`installment-badge installment-badge--${p.status}`}
            >
              {p.status === 'active' ? 'Ativo' : 'Cancelado'}
            </span>
          </header>
          <dl className="installment-overview">
            <div>
              <dt>Valor original</dt>
              <dd>{formatMoney(p.total_amount_cents)}</dd>
            </div>
            <div>
              <dt>Pagas antes do controle</dt>
              <dd>
                {p.paid_before_tracking} de {p.installment_count}
              </dd>
            </div>
            <div>
              <dt>Parcelas no cronograma</dt>
              <dd>{p.parts.length}</dd>
            </div>
          </dl>
          <details className="installment-schedule">
            <summary>
              <span>
                <CalendarDays size={18} aria-hidden="true" /> Cronograma de
                parcelas
              </span>
              <ChevronDown
                size={18}
                className="schedule-chevron"
                aria-hidden="true"
              />
            </summary>
            <ul aria-label={`Parcelas de ${p.description}`}>
              {p.parts.map((part) => (
                <li
                  key={part.id}
                  className={
                    part.status === 'cancelled'
                      ? 'installment-row--cancelled'
                      : undefined
                  }
                >
                  <span className="installment-number">
                    {String(part.installment_number).padStart(2, '0')}
                    <small>/{p.installment_count}</small>
                  </span>
                  <div className="installment-period">
                    <strong>
                      {monthLabel(part.competence_month.slice(0, 7))}
                    </strong>
                    <span>Competência da parcela</span>
                  </div>
                  <strong className="installment-amount">
                    {formatMoney(part.amount_cents - part.discount_cents)}
                  </strong>
                  <span
                    className={`installment-badge installment-badge--${part.status}`}
                  >
                    {part.status === 'active' ? 'Ativa' : 'Cancelada'}
                  </span>
                </li>
              ))}
            </ul>
          </details>
          <PlanActions
            plan={p}
            allowsEarly={
              cards.data.find((card) => card.id === p.credit_card_id)
                ?.allows_early_settlement === true
            }
          />
        </Card>
      ))}
    </div>
  );
}
