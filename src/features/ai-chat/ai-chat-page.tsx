import { MessageCircle } from 'lucide-react';
import { FeaturePage } from '@/components/shared/feature-page';
export function AiChatPage() {
  return (
    <FeaturePage
      title="Assistente IA"
      description="Converse sobre suas finanças com contexto e segurança."
      icon={MessageCircle}
      stage={5}
      items={[
        'Gemini exclusivamente em Supabase Edge Functions',
        'Ferramentas autorizadas e respostas estruturadas',
        'Confirmação de sucesso somente após persistência real',
      ]}
    />
  );
}
