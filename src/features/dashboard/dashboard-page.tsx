import { useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Layers,
  Plus,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { currentMonth, monthLabel, shiftMonth } from '@/lib/utils/calendar';

const indicators = [
  {
    title: 'Saldo de caixa',
    subtitle: 'Somente valores efetivamente recebidos e pagos',
    icon: Wallet,
    tone: 'violet',
  },
  {
    title: 'Receitas previstas',
    subtitle: 'Previsão de entradas para o mês',
    icon: ArrowDownLeft,
    tone: 'green',
  },
  {
    title: 'Despesas pendentes',
    subtitle: 'Obrigações que ainda precisam ser pagas',
    icon: ArrowUpRight,
    tone: 'orange',
  },
  {
    title: 'Total das faturas',
    subtitle: 'Compromissos dos cartões no mês',
    icon: CreditCard,
    tone: 'blue',
  },
];

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
          <strong>O primeiro passo para uma rotina mais leve</strong>
          <p>
            Fundação pronta. Conexão, autenticação e dados financeiros entram
            nas próximas etapas.
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
        {indicators.map(({ title, subtitle, icon: Icon, tone }) => (
          <Card className="metric-card" key={title}>
            <div className="metric-header">
              <span>{title}</span>
              <span className={`metric-icon metric-icon--${tone}`}>
                <Icon size={19} />
              </span>
            </div>
            <strong className="metric-value" aria-label="Indisponível">
              —
            </strong>
            <p>{subtitle}</p>
            <span className="metric-status">Aguardando integração</span>
          </Card>
        ))}
      </div>
      <div className="dashboard-columns">
        <Card>
          <header className="panel-heading">
            <div>
              <h2>Evolução financeira</h2>
              <p>Entradas e saídas ao longo dos meses</p>
            </div>
            <span className="badge">Caixa</span>
          </header>
          <div className="chart-empty">
            <div className="empty-chart-lines" aria-hidden="true" />
            <Wallet size={27} />
            <h3>Uma visão que começa com seus registros</h3>
            <p>O gráfico será exibido quando houver dados reais.</p>
          </div>
        </Card>
        <Card>
          <header className="panel-heading">
            <div>
              <h2>Despesas por categoria</h2>
              <p>Entenda para onde vai seu dinheiro</p>
            </div>
          </header>
          <div className="chart-empty">
            <div className="empty-donut" aria-hidden="true">
              <Layers size={24} />
            </div>
            <h3>Sem dados conectados</h3>
            <p>A análise por competência será implementada na Etapa 4.</p>
          </div>
        </Card>
      </div>
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
        <Card className="forecast-panel">
          <header className="panel-heading">
            <div>
              <h2>Um olhar para o fim do mês</h2>
              <p>Projeção financeira</p>
            </div>
            <Sparkles size={20} />
          </header>
          <strong className="metric-value">—</strong>
          <p>Saldo previsto indisponível até a integração dos registros.</p>
          <dl className="forecast-details">
            <div>
              <dt>Receitas recebidas</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>Despesas pagas</dt>
              <dd>—</dd>
            </div>
          </dl>
        </Card>
      </div>
      <footer className="page-footnote">
        Seus números merecem precisão. Nenhum dado financeiro fictício é
        exibido.
      </footer>
    </div>
  );
}
