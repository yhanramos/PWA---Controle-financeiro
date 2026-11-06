import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/financial-money';
import { monthLabel } from '@/lib/utils/calendar';
import { dataErrorMessage } from '@/services/data-error';
import { useChartData } from './use-chart-data';

const currency = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value)
    ? formatMoney(value)
    : '—';
const shortMonth = (value: string) => `${value.slice(5)}/${value.slice(2, 4)}`;
const axisMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value / 100);
const tooltipStyle = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  color: 'var(--foreground)',
  borderRadius: 10,
};

export function DashboardCharts({ month }: { month: string }) {
  const query = useChartData(month);
  const data = query.data;
  const state = query.isError ? (
    <div className="chart-empty" role="alert">
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
    <div className="chart-empty" role="status">
      Carregando gráficos…
    </div>
  ) : null;
  return (
    <div className="dashboard-columns">
      <Card className="financial-chart" aria-busy={query.isFetching}>
        <header className="panel-heading">
          <div>
            <h2>Evolução financeira</h2>
            <p>Seis meses até {monthLabel(month)} · caixa realizado</p>
          </div>
          <span className="badge">Caixa</span>
        </header>
        {state ??
          (data &&
            (data.hasCash ? (
              <>
                <div
                  className="financial-chart-canvas"
                  role="img"
                  aria-label="Entradas e saídas mensais de caixa. Valores disponíveis na tabela abaixo."
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.evolution}
                      accessibilityLayer
                      margin={{ top: 16, right: 12, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tickFormatter={shortMonth}
                        stroke="var(--muted-foreground)"
                      />
                      <YAxis
                        tickFormatter={axisMoney}
                        stroke="var(--muted-foreground)"
                        width={65}
                      />
                      <Tooltip
                        formatter={currency}
                        labelFormatter={(label) => monthLabel(String(label))}
                        contentStyle={tooltipStyle}
                      />
                      <Legend />
                      <Bar
                        dataKey="income"
                        name="Entradas"
                        fill="var(--positive)"
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={false}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Saídas"
                        fill="var(--warning)"
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <details>
                  <summary>Ver valores por mês</summary>
                  <div className="financial-chart-table">
                    <table>
                      <caption>Caixa realizado em reais</caption>
                      <thead>
                        <tr>
                          <th scope="col">Mês</th>
                          <th scope="col">Entradas</th>
                          <th scope="col">Saídas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.evolution.map((row) => (
                          <tr key={row.month}>
                            <th scope="row">{monthLabel(row.month)}</th>
                            <td>{formatMoney(row.income)}</td>
                            <td>{formatMoney(row.expenses)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              <div className="chart-empty">
                <h3>Sem movimentações de caixa no período</h3>
                <p>Recebimentos e pagamentos efetivos aparecerão aqui.</p>
              </div>
            )))}
        <p className="financial-chart-note">
          Saídas incluem pagamentos de faturas. Sem saldo inicial ou projeções;
          estornos e cancelamentos refletem a situação atual.
        </p>
      </Card>
      <Card className="financial-chart" aria-busy={query.isFetching}>
        <header className="panel-heading">
          <div>
            <h2>Despesas por categoria</h2>
            <p>{monthLabel(month)} · competência</p>
          </div>
        </header>
        {state ??
          (data &&
            (data.expenses.length ? (
              <>
                <div
                  className="financial-chart-canvas"
                  role="img"
                  aria-label="Distribuição das despesas por categoria. Valores disponíveis na lista abaixo."
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.expenses}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius="48%"
                        outerRadius="78%"
                        isAnimationActive={false}
                      >
                        {data.expenses.map((category) => (
                          <Cell key={category.id} fill={category.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={currency}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p>
                  Total: <strong>{formatMoney(data.total)}</strong>
                </p>
                <ul className="financial-chart-categories">
                  {data.expenses.map((category) => (
                    <li key={category.id}>
                      <span>
                        <i
                          style={{ backgroundColor: category.color }}
                          aria-hidden="true"
                        />
                        {category.name}
                      </span>
                      <strong>{formatMoney(category.amount)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="chart-empty">
                <h3>Sem despesas por competência neste mês</h3>
                <p>Despesas e parcelas registradas aparecerão aqui.</p>
              </div>
            )))}
        <p className="financial-chart-note">
          Inclui despesas previstas e parcelas após descontos, pela competência
          original. Pagamentos de faturas não são somados novamente.
        </p>
      </Card>
    </div>
  );
}
