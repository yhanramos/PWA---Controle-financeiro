import { Link } from 'react-router';
import { Check, CircleDashed, ExternalLink, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';

export function SettingsPage() {
  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">BASE PARA CRESCER</span>
        <h1>Configurações</h1>
        <p>O status da fundação, sem atalhos para os seus dados.</p>
      </header>
      <Card className="settings-panel">
        <ShieldCheck size={28} />
        <h2>Conexão com o Supabase</h2>
        <p>
          {supabase
            ? 'Variáveis válidas e cliente inicializado. Isso não comprova conectividade, autenticação ou disponibilidade do banco.'
            : 'Configure as variáveis abaixo no arquivo .env.local para inicializar o cliente.'}
        </p>
        <code>VITE_SUPABASE_URL</code>
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>
        <span className="badge">
          {supabase
            ? 'Cliente configurado · conexão não verificada'
            : 'Configuração pendente'}
        </span>
        <p>
          Use apenas a chave pública do projeto. Chaves secretas e a chave do
          Gemini pertencem exclusivamente ao backend.
        </p>
        <Button asChild variant="outline">
          <Link to="/login">
            Sobre autenticação
            <ExternalLink size={16} />
          </Link>
        </Button>
      </Card>
      <Card className="settings-panel">
        <h2>O que está disponível</h2>
        <ul className="status-list">
          <li>
            <Check size={18} />
            Navegação, layout responsivo e tema escuro
          </li>
          <li>
            <Check size={18} />
            Configuração do PWA e cache de recursos estáticos
          </li>
          <li>
            <Check size={18} />
            Cliente Supabase e infraestrutura de consultas
          </li>
          <li>
            <CircleDashed size={18} />
            Autenticação, banco e RLS · Etapa 2
          </li>
          <li>
            <CircleDashed size={18} />
            Operações financeiras · Etapa 3
          </li>
          <li>
            <CircleDashed size={18} />
            Indicadores e gráficos reais · Etapa 4
          </li>
          <li>
            <CircleDashed size={18} />
            Assistente Gemini · Etapa 5
          </li>
        </ul>
      </Card>
      <Card className="settings-panel">
        <h2>Instalar no celular</h2>
        <p>
          Depois de publicar por HTTPS, use a opção de instalação do navegador
          no Android. No Safari do iOS, use Compartilhar → Adicionar à Tela de
          Início. A disponibilidade depende do navegador.
        </p>
        <p>
          O service worker está desativado no desenvolvimento. A instalação e o
          comportamento offline precisam ser validados após o build de produção.
        </p>
      </Card>
    </div>
  );
}
