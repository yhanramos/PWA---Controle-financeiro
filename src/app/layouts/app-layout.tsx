import {
  ArrowDownUp,
  ChartNoAxesCombined,
  CreditCard,
  Grid2X2,
  Layers,
  Menu,
  MessageCircle,
  Repeat2,
  Settings2,
  Tags,
  TrendingUp,
  Wallet,
  WifiOff,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useNavigation } from 'react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useOnline } from '@/hooks/use-online';
import { PwaStatus } from '@/components/shared/pwa-status';
import { LogoutButton, useAuth } from '@/features/auth';

const navigation = [
  { to: '/', label: 'Visão geral', icon: Grid2X2 },
  { to: '/movimentacoes', label: 'Movimentações', icon: ArrowDownUp },
  { to: '/cartoes', label: 'Cartões', icon: CreditCard },
  { to: '/parcelamentos', label: 'Parcelamentos', icon: Layers },
  { to: '/receitas', label: 'Receitas', icon: TrendingUp },
  { to: '/recorrencias', label: 'Recorrências', icon: Repeat2 },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/assistente', label: 'Assistente IA', icon: MessageCircle },
];

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const online = useOnline();
  const navigationState = useNavigation();
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span>
            <Wallet size={24} />
          </span>
          clareza<span className="brand-dot">.</span>
        </NavLink>
        <p className="sidebar-caption">FINANÇAS PESSOAIS</p>
        <nav aria-label="Navegação principal">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <ChartNoAxesCombined size={22} />
            <strong>Um passo de cada vez</strong>
            <p>
              Mais organização hoje.
              <br />
              Mais tranquilidade amanhã.
            </p>
          </div>
          <NavLink to="/configuracoes">
            <Settings2 size={19} />
            Configurações
          </NavLink>
          <span className="version">v0.1 · Fundação</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="topbar-title">Seu espaço financeiro</span>
          <div className="topbar-actions">
            <span className="badge">
              <span className="status-dot" />
              Em desenvolvimento
            </span>
            <span
              className="avatar"
              aria-label={`Conta de ${user?.email ?? 'usuário'}`}
              title={user?.email}
            >
              {user?.email?.slice(0, 1).toUpperCase() ?? 'C'}
            </span>
            <LogoutButton />
          </div>
        </header>
        <main
          id="main"
          className="main-content"
          aria-busy={navigationState.state === 'loading'}
        >
          {navigationState.state === 'loading' && (
            <p role="status" className="muted">
              Carregando página…
            </p>
          )}
          {online ? (
            <Outlet />
          ) : (
            <section className="offline-state" role="status">
              <WifiOff size={40} />
              <h1>Você está sem conexão</h1>
              <p>
                A estrutura do aplicativo pode estar disponível offline. Para
                acessar ou registrar informações financeiras, reconecte-se à
                internet.
              </p>
              <Button onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </section>
          )}
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navegação mobile">
        {navigation.slice(0, 3).map(({ to, label, icon: Icon }) => (
          <NavLink
            to={to}
            key={to}
            end={to === '/'}
            onClick={() => setMenuOpen(false)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
          <span>Mais</span>
        </button>
      </nav>
      {menuOpen && (
        <nav id="mobile-menu" className="mobile-menu" aria-label="Mais páginas">
          {[
            ...navigation.slice(3),
            { to: '/configuracoes', label: 'Configurações', icon: Settings2 },
          ].map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
      <PwaStatus />
    </div>
  );
}
