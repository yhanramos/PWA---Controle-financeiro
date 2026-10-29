import type { LucideIcon } from 'lucide-react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  items: string[];
  stage?: number;
};
export function FeaturePage({
  title,
  description,
  icon: Icon,
  items,
  stage = 3,
}: Props) {
  return (
    <div className="page-stack">
      <header className="page-heading">
        <span className="eyebrow">SEU DINHEIRO, COM CLAREZA</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <Card className="feature-placeholder">
        <span className="feature-icon">
          <Icon size={30} />
        </span>
        <span className="badge">Etapa {stage} · planejada</span>
        <h2>Este espaço está sendo preparado</h2>
        <p>
          A estrutura de navegação está pronta. Os registros e a persistência
          serão implementados na etapa indicada.
        </p>
        <ul>
          {items.map((item) => (
            <li key={item}>
              <ArrowRight size={16} />
              {item}
            </li>
          ))}
        </ul>
        <div className="privacy-note">
          <LockKeyhole size={16} />
          Nenhuma informação financeira é registrada nesta etapa.
        </div>
        <Button asChild variant="outline">
          <Link to="/configuracoes">Ver configuração do projeto</Link>
        </Button>
      </Card>
    </div>
  );
}
