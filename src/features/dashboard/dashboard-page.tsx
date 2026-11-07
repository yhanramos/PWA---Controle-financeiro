import { useState } from 'react';
import { Link } from 'react-router';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { currentMonth, monthLabel, shiftMonth } from '@/lib/utils/calendar';
import { CashBalanceCard } from './cash-balance-card';
import { MonthlyIndicatorCards } from './monthly-indicator-cards';
import { DashboardCharts } from './dashboard-charts';
import { ForecastPanel } from './forecast-panel';
import { UpcomingDues } from './upcoming-dues';
import { RemainingBalanceCard } from './remaining-balance-card';

export function DashboardPage() {
  const [month, setMonth] = useState(currentMonth);
  return (
    <div className="page-stack">
      <header className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">UM NOVO OLHAR PARA SUAS FINANÇAS</span>
          <h1>
            Sua vida financeira, mais clara<span>.</span>
          </h1>
          <p>Receitas, despesas e planos. Tudo no seu lugar.</p>
        </div>
        <Button asChild>
          <Link to="/movimentacoes">
            <Plus size={18} />
            Movimentações
          </Link>
        </Button>
      </header>
      <div className="dashboard-toolbar">
        <div className="month-picker">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Mês anterior"
            disabled={month <= '1900-01'}
            onClick={() => setMonth((value) => shiftMonth(value, -1))}
          >
            <ChevronLeft size={18} />
          </Button>
          <span aria-live="polite">
            <CalendarDays size={16} />
            {monthLabel(month)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próximo mês"
            disabled={month >= '9999-12'}
            onClick={() => setMonth((value) => shiftMonth(value, 1))}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
        <Button
          variant="outline"
          disabled={month === currentMonth()}
          onClick={() => setMonth(currentMonth())}
        >
          Mês atual
        </Button>
        <span className="muted">Visão mensal · America/Sao_Paulo</span>
      </div>
      <p className="dashboard-filter-note">
        No mês atual, as faturas mostram o ciclo em formação, mesmo com
        vencimento no mês seguinte. Nos outros meses, seguem o vencimento.
        Receitas, despesas e próximos vencimentos seguem o mês escolhido; o
        saldo total acumula entradas até hoje, antes das despesas, e a projeção
        respeita as datas de pagamento.
      </p>
      <div className="metric-grid">
        <CashBalanceCard />
        <RemainingBalanceCard month={month} />
        <MonthlyIndicatorCards month={month} />
      </div>
      <DashboardCharts month={month} />
      <div className="dashboard-columns">
        <UpcomingDues key={month} month={month} />
        <ForecastPanel month={month} />
      </div>
      <footer className="page-footnote">
        Os valores refletem a situação atual dos registros, inclusive em meses
        passados.
      </footer>
    </div>
  );
}
