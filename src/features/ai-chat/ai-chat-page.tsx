import { useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dataErrorMessage } from '@/services/data-error';
import { useAssistant, useChatHistory } from './ai-chat-data';
export function AiChatPage() {
  const history = useChatHistory();
  const assistant = useAssistant();
  const [message, setMessage] = useState('');
  const [conversationId] = useState(() => crypto.randomUUID());
  const attempt = useRef<{ text: string; id: string } | null>(null);
  const [lastAnswer, setLastAnswer] = useState('');
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || assistant.isPending) return;
    if (attempt.current?.text !== text)
      attempt.current = { text, id: crypto.randomUUID() };
    setLastAnswer('');
    try {
      const response = await assistant.mutateAsync({
        message: text,
        requestId: attempt.current.id,
        conversationId,
      });
      setLastAnswer(response.answer);
      setMessage('');
      attempt.current = null;
    } catch {
      /* Preserva a mensagem e a chave para repetição segura. */
    }
  }
  return (
    <div className="page-stack ai-chat">
      <header className="page-heading">
        <span className="eyebrow">SUAS FINANÇAS EM CONVERSA</span>
        <h1>Assistente IA</h1>
        <p>Consulte seu saldo e um resumo mensal das contas.</p>
      </header>
      <Card className="ai-chat-intro">
        <MessageCircle aria-hidden="true" />
        <div>
          <strong>Comece com uma pergunta</strong>
          <p>
            “Qual é meu saldo?” ou “Quais são minhas pendências de dezembro de
            2026?”
          </p>
          <p>
            Esta primeira versão faz consultas. Cada pergunta é independente;
            informe o mês quando necessário. Cadastros e alterações continuam
            nas telas financeiras.
          </p>
        </div>
      </Card>
      <Card>
        <div className="ai-chat-heading">
          <h2>Conversa</h2>
          <Button
            variant="ghost"
            disabled={history.isFetching}
            onClick={() => void history.refetch()}
          >
            <RefreshCw size={16} /> Atualizar histórico
          </Button>
        </div>
        {history.isPending && <p role="status">Carregando histórico…</p>}
        {history.isError && (
          <p role="alert">{dataErrorMessage(history.error)}</p>
        )}
        {history.data?.length === 0 && (
          <p className="muted">Suas consultas aparecerão aqui.</p>
        )}
        <ol className="ai-chat-messages" aria-label="Histórico de consultas">
          {history.data?.map((item) => (
            <li
              key={item.id}
              className={`ai-chat-message ai-chat-message--${item.role}`}
            >
              <strong>{item.role === 'user' ? 'Você' : 'Assistente'}</strong>
              <p>{item.content}</p>
            </li>
          ))}
        </ol>
        {lastAnswer &&
          !history.data?.some(
            (item) => item.role === 'assistant' && item.content === lastAnswer,
          ) && (
            <div className="ai-chat-message" role="status">
              <strong>Assistente</strong>
              <p>{lastAnswer}</p>
            </div>
          )}
        {assistant.isPending && <p role="status">Consultando suas finanças…</p>}
        <form onSubmit={(event) => void send(event)} className="ai-chat-form">
          <label htmlFor="assistant-message">Sua pergunta</label>
          <textarea
            id="assistant-message"
            maxLength={2000}
            rows={3}
            required
            value={message}
            disabled={assistant.isPending}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Como estão minhas contas deste mês?"
          />
          <p className="muted">
            O texto da sua pergunta é enviado ao Google Gemini para identificar
            a consulta. Os valores são calculados no banco e não são enviados ao
            modelo. Histórico por até 30 dias, com limpeza na próxima consulta;
            exibimos as últimas 40 mensagens.
          </p>
          <Button
            type="submit"
            disabled={assistant.isPending || !message.trim()}
          >
            <Send size={16} />
            {assistant.isPending ? 'Consultando…' : 'Enviar pergunta'}
          </Button>
          {assistant.isError && (
            <div role="alert">
              <p>{dataErrorMessage(assistant.error)}</p>
              <Button
                variant="ghost"
                onClick={() => {
                  attempt.current = null;
                  assistant.reset();
                }}
              >
                Iniciar nova tentativa
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
