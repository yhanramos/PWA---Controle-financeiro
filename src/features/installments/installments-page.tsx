import { useState } from 'react';
import { PlanActions } from './plan-actions';
import { Layers } from 'lucide-react';
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
    {
      name: 'purchased_on',
      label: 'Data da compra',
      kind: 'date',
      required: true,
    },
    {
      name: 'first_close',
      label: 'Fechamento da primeira fatura ainda devida',
      kind: 'date',
      required: true,
    },
    {
      name: 'first_due',
      label: 'Vencimento da primeira fatura ainda devida',
      kind: 'date',
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
        rows={plans.data.map((p) => ({
          title: p.description,
          detail: `${p.installment_count} parcelas · ${p.paid_before_tracking} pagas antes do controle · ${p.status === 'active' ? 'Ativo' : 'Cancelado'}`,
          value: formatMoney(p.total_amount_cents),
        }))}
        note="Informe as datas da primeira fatura ainda devida. As próximas mantêm os dias informados, limitados ao último dia de cada mês. Parcelas históricas não criam saídas de caixa."
      />
      {plans.data.map((p) => (
        <Card key={p.id}>
          <details>
            <summary>Cronograma · {p.description}</summary>
            <ul>
              {p.parts.map((part) => (
                <li key={part.id}>
                  Parcela {part.installment_number}/{p.installment_count} ·
                  competência {part.competence_month.slice(0, 7)} ·{' '}
                  {formatMoney(part.amount_cents - part.discount_cents)} ·{' '}
                  {part.status === 'active' ? 'Ativa' : 'Cancelada'}
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
