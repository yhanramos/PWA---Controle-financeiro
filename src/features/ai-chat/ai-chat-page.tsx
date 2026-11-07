import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dataErrorMessage } from '@/services/data-error';
import { AssistantError, useAssistant } from './ai-chat-data';

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

export function AiChatPage() {
  const assistant = useAssistant();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId] = useState(() => crypto.randomUUID());
  const attempt = useRef<{ text: string; id: string } | null>(null);
  const sending = useRef(false);
  const messagesRef = useRef<HTMLOListElement>(null);
  const latestMessageId = messages.at(-1)?.id;
  const uncertain =
    assistant.isError &&
    !(
      assistant.error instanceof AssistantError &&
      assistant.error.newRequestAllowed
    );

  useEffect(() => {
    const list = messagesRef.current;
    if (!list) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
      ? 'instant'
      : 'smooth';
    list.scrollTo({ top: list.scrollHeight, behavior });
    if (!assistant.isPending && latestMessageId)
      list.scrollIntoView({ block: 'nearest', behavior });
  }, [latestMessageId, assistant.isPending]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending.current) return;
    sending.current = true;
    if (!uncertain || !attempt.current) {
      attempt.current = { text, id: crypto.randomUUID() };
      const current = attempt.current;
      setMessages((previous) => [
        ...previous,
        { id: current.id, role: 'user', content: current.text },
      ]);
    }
    const current = attempt.current;
    try {
      const response = await assistant.mutateAsync({
        message: current.text,
        requestId: current.id,
        conversationId,
      });
      setMessages((previous) => [
        ...previous,
        {
          id: `${current.id}-answer`,
          role: 'assistant',
          content: response.answer,
        },
      ]);
      setMessage('');
      attempt.current = null;
    } catch {
      // Reenvio incerto preserva a chave e o texto, sem duplicar a mensagem na tela.
    } finally {
      sending.current = false;
    }
  }

  return (
    <div className="page-stack ai-chat">
      <header className="page-heading">
        <span className="eyebrow">SUAS FINANÇAS EM CONVERSA</span>
        <h1>Assistente IA</h1>
        <p>Consulte suas contas e registre despesas com ou sem cartão.</p>
      </header>
      <Card>
        <div className="ai-chat-heading">
          <h2>Conversa</h2>
        </div>
        {messages.length === 0 && (
          <p className="muted">
            A conversa fica aqui até você sair ou recarregar a tela.
          </p>
        )}
        <ol
          ref={messagesRef}
          className="ai-chat-messages"
          aria-label="Conversa atual"
          aria-live="polite"
        >
          {messages.map((item) => (
            <li
              key={item.id}
              className={`ai-chat-message ai-chat-message--${item.role}`}
            >
              <strong>{item.role === 'user' ? 'Você' : 'Assistente'}</strong>
              <p>{item.content}</p>
            </li>
          ))}
          {assistant.isPending && (
            <li role="status">Processando sua mensagem…</li>
          )}
        </ol>
        <form onSubmit={(event) => void send(event)} className="ai-chat-form">
          <label htmlFor="assistant-message">Sua mensagem</label>
          <textarea
            id="assistant-message"
            maxLength={2000}
            rows={3}
            required
            value={message}
            disabled={assistant.isPending || uncertain}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key !== 'Enter' ||
                event.shiftKey ||
                event.nativeEvent.isComposing
              )
                return;
              event.preventDefault();
              if (!event.repeat && !sending.current && message.trim())
                event.currentTarget.form?.requestSubmit();
            }}
            aria-describedby="assistant-keyboard-hint"
            placeholder="Digite sua mensagem…"
          />
          <p id="assistant-keyboard-hint" className="muted">
            Enter envia · Shift+Enter quebra a linha.
          </p>
          <p className="muted">
            Sua mensagem e os nomes das contas, categorias e cartões ativos são
            enviados ao Google Gemini. Os gastos registrados permanecem salvos;
            a conversa não.
          </p>
          <Button
            type="submit"
            disabled={assistant.isPending || !message.trim()}
          >
            <Send size={16} />
            {assistant.isPending
              ? 'Processando…'
              : uncertain
                ? 'Verificar mesma tentativa'
                : 'Enviar mensagem'}
          </Button>
          {assistant.isError && (
            <div role="alert">
              <p>{dataErrorMessage(assistant.error)}</p>
              {!uncertain && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    attempt.current = null;
                    assistant.reset();
                  }}
                >
                  Iniciar nova tentativa
                </Button>
              )}
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
