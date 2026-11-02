import { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { currentMonth, monthLabel, shiftMonth } from '@/lib/utils/calendar';
import { CashBalanceCard } from './cash-balance-card';
import { MonthlyIndicatorCards } from './monthly-indicator-cards';
import { DashboardCharts } from './dashboard-charts';
import { ForecastPanel } from './forecast-panel';

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
            onClick={() => setMonth(shiftMonth(month, -1))}
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
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight size={18} />
          </Button>
        </div>
        <span className="muted">Visão mensal · America/Sao_Paulo</span>
      </div>
      <section className="setup-banner" aria-label="Status da implementação">
        <span className="feature-icon">
          <Sparkles size={23} />
        </span>
        <div>
          <strong>Seu saldo e indicadores já estão conectados</strong>
          <p>
            Consulte o saldo, os indicadores e os gráficos dos seus registros. A
            projeção já considera seus compromissos. Próximos vencimentos serão
            integrados na próxima fase.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/configuracoes">
            Ver configuração
            <ArrowUpRight size={16} />
          </Link>
        </Button>
      </section>
      <div className="metric-grid">
        <CashBalanceCard />
        <MonthlyIndicatorCards month={month} />
      </div>
      <DashboardCharts month={month} />
      <div className="dashboard-columns">
        <Card>
          <header className="panel-heading">
            <div>
              <h2>Próximos vencimentos</h2>
              <p>Seus compromissos, sem surpresas</p>
            </div>
            <CalendarDays size={20} />
          </header>
          <div className="simple-empty">
            <CalendarDays size={25} />
            <div>
              <h3>Calendário financeiro em preparação</h3>
              <p>Faturas, parcelas e recorrências aparecerão aqui.</p>
            </div>
          </div>
        </Card>
        <ForecastPanel month={month} />
      </div>
      <footer className="page-footnote">
        Seus números merecem precisão. Nenhum dado financeiro fictício é
        exibido.
      </footer>
    </div>
  );
}
