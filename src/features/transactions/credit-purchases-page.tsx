import { RecordEditor } from '@/features/shared/record-editor';
import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Link } from 'react-router';
import {
  FinancialWorkspace,
  type Field,
} from '@/features/shared/financial-workspace';
import { useFinancialRows } from '@/features/shared/financial-data';
import { DataState } from '@/components/shared/data-state';
import { dataErrorMessage } from '@/services/data-error';
import { formatMoney } from '@/lib/financial-money';
import { useTransactions } from './transaction-data';
import { useCreditPurchase } from './credit-data';
export function CreditPurchasesPage() {
  const cards = useFinancialRows('credit_cards');
  const categories = useFinancialRows('categories');
  const transactions = useTransactions();
  const save = useCreditPurchase();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const queries = [cards, categories, transactions];
  const failed = queries.find((q) => q.isError);
  if (failed)
    return (
      <DataState
        title="Não foi possível carregar as compras"
        error
        description={dataErrorMessage(failed.error)}
        onRetry={() => {
          void Promise.all(queries.map((q) => q.refetch()));
        }}
      />
    );
  if (!cards.data || !categories.data || !transactions.data)
    return <DataState title="Carregando compras…" loading />;
  const fields: Field[] = [
    { name: 'description', label: 'Descrição', required: true },
    {
      name: 'card',
      label: 'Cartão',
      kind: 'select',
      required: true,
      options: cards.data
        .filter((c) => c.is_active)
        .map((c) => ({ value: String(c.id), label: String(c.name) })),
    },
    {
      name: 'category',
      label: 'Categoria de despesa',
      kind: 'select',
      required: true,
      options: categories.data
        .filter((c) => c.is_active && c.kind === 'expense')
        .map((c) => ({ value: String(c.id), label: String(c.name) })),
    },
    { name: 'amount', label: 'Valor da compra (R$)', required: true },
    { name: 'date', label: 'Data da compra', kind: 'date', required: true },
    {
      name: 'month',
      label: 'Mês de vencimento da fatura (opcional)',
      kind: 'month',
    },
  ];
  return (
    <div className="page-stack">
      <FinancialWorkspace
        title="Compras no crédito"
        eyebrow="COMPROMISSOS DO CARTÃO"
        description="Registre uma compra avulsa na fatura do cartão."
        action="Nova compra"
        fields={fields}
        icon={<CreditCard />}
        onSave={async (values) => {
          await save.mutateAsync({ values, key });
          setKey(crypto.randomUUID());
        }}
        rows={transactions.data
          .filter((t) => t.payment_method === 'credit')
          .map((t) => ({
            title: t.description,
            detail: `Vencimento ${t.due_date} · ${t.status === 'cancelled' ? 'Cancelada' : 'Na fatura'}`,
            value: formatMoney(t.amount_cents),
          }))}
        note="No dia do fechamento, a compra entra no próximo ciclo. Você pode informar outro mês de vencimento conforme o emissor. A saída de caixa ocorre somente no pagamento da fatura."
      />
      {transactions.data
        .filter((row) => row.payment_method === 'credit')
        .map((row) => (
          <RecordEditor key={row.id} table="transactions" row={row} />
        ))}
      <Link to="/faturas">Consultar e pagar faturas</Link>
    </div>
  );
}
