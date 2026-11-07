import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { useOnline } from '@/hooks/use-online';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { environment } from '@/lib/validators/environment';
import { configureWallet, type WalletAction } from './wallet-service';

function WalletForm({ userId }: { userId: string }) {
  const online = useOnline();
  const cache = useQueryClient();
  const key = ['users', userId, 'wallet'] as const;
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      configureWallet(userId, { action: 'status' }, signal),
    enabled: online,
    retry: false,
  });
  async function perform(action: WalletAction) {
    setBusy(true);
    setMessage('');
    setFailed(false);
    if (action.action === 'rotate' || action.action === 'revoke') setToken('');
    try {
      const result = await configureWallet(userId, action);
      // The credential lives only in this mounted view, never in Query Cache/storage.
      setToken((previous) => result.token ?? previous);
      await cache.invalidateQueries({ queryKey: key });
      setMessage('Configuração salva.');
    } catch (error) {
      setFailed(true);
      setMessage(
        error instanceof Error ? error.message : 'Não foi possível salvar.',
      );
    } finally {
      setBusy(false);
    }
  }
  const state = query.data;
  return (
    <Card className="settings-panel wallet-panel">
      <h2>Apple Pay pelo Atalhos</h2>
      <p>
        Registre compras no crédito mesmo com o PWA fechado. Requer internet e
        uma automação configurada no iPhone. Compras no débito não são
        suportadas nesta integração.
      </p>
      {!online && <p role="status">Conecte-se para configurar.</p>}
      {query.isPending && online && <p role="status">Carregando integração…</p>}
      {query.isError && (
        <>
          <p role="alert">{query.error.message}</p>
          <Button onClick={() => void query.refetch()}>Tentar novamente</Button>
        </>
      )}
      {state && (
        <>
          <p>
            Chave: {state.enabled ? 'ativa' : 'desativada'}. Último registro:{' '}
            {state.last_received_at
              ? new Date(state.last_received_at).toLocaleString('pt-BR')
              : 'nenhum'}
            .
          </p>
          <div className="finance-form-actions">
            <Button
              disabled={busy || !online}
              onClick={() => {
                if (
                  !state.enabled ||
                  window.confirm(
                    'Substituir a chave? Os Atalhos com a chave anterior deixarão de funcionar.',
                  )
                )
                  void perform({ action: 'rotate' });
              }}
            >
              {state.enabled ? 'Substituir chave' : 'Gerar chave'}
            </Button>
            {state.enabled && (
              <Button
                disabled={busy || !online}
                onClick={() => {
                  if (
                    window.confirm(
                      'Revogar a chave e interromper novos registros automáticos?',
                    )
                  )
                    void perform({ action: 'revoke' });
                }}
              >
                Revogar chave
              </Button>
            )}
          </div>
          {token && (
            <div className="profile-field">
              <label htmlFor="wallet-token">
                Chave exibida somente nesta tela. Copie para seu Atalho e não
                compartilhe.
              </label>
              <input
                id="wallet-token"
                type="password"
                readOnly
                value={token}
                autoComplete="off"
              />
              <Button
                onClick={() =>
                  void navigator.clipboard.writeText(token).then(
                    () => setMessage('Chave copiada.'),
                    () => {
                      setFailed(true);
                      setMessage(
                        'Não foi possível copiar. Selecione o campo e copie manualmente.',
                      );
                    },
                  )
                }
              >
                Copiar chave
              </Button>
              <Button onClick={() => setToken('')}>Ocultar chave</Button>
            </div>
          )}
          <h3>Associar cartão</h3>
          <p>
            Use o texto exato de “Cartão ou Tíquete” recebido pelo Atalho. Cada
            nome deve identificar um único cartão. A categoria escolhida será
            usada nessas compras.
          </p>
          <form
            className="finance-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void perform({
                action: 'save',
                alias: String(data.get('alias')),
                card_id: String(data.get('card')),
                category_id: String(data.get('category')),
              });
            }}
          >
            <label>
              Nome na Carteira
              <input name="alias" required maxLength={200} disabled={busy} />
            </label>
            <label>
              Cartão cadastrado
              <select name="card" required disabled={busy}>
                <option value="">Selecione</option>
                {state.cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoria padrão
              <select name="category" required disabled={busy}>
                <option value="">Selecione</option>
                {state.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={busy || !online}>
              Salvar associação
            </Button>
          </form>
          <ul>
            {state.mappings.map((mapping) => (
              <li key={mapping.alias}>
                <span>
                  {mapping.alias} →{' '}
                  {state.cards.find((card) => card.id === mapping.card_id)
                    ?.name ?? 'Cartão inativo'}{' '}
                  ·{' '}
                  {state.categories.find(
                    (category) => category.id === mapping.category_id,
                  )?.name ?? 'Categoria inativa'}
                </span>
                <Button
                  disabled={busy || !online}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Remover esta associação? Novas compras deste nome serão recusadas.',
                      )
                    )
                      void perform({ action: 'remove', alias: mapping.alias });
                  }}
                >
                  Remover
                </Button>
              </li>
            ))}
          </ul>
          <h3>Destino da automação</h3>
          <code>
            {environment.success
              ? `${environment.data.url}/functions/v1/apple-wallet`
              : ''}
          </code>
          <p>
            No Atalhos, use POST com JSON e o cabeçalho X-Wallet-Key com sua
            chave. Campos: event_id (UUID), card, merchant, amount (texto
            decimal sem separador de milhar), currency (BRL) e occurred_on
            (yyyy-MM-dd).
          </p>
          <p>
            Gere o UUID uma única vez por compra. Em caso de falha, preserve
            esse UUID e os dados para reenviar; executar toda a automação
            novamente gera outro evento e pode duplicar a compra. Confira o
            resultado antes de registrar manualmente.
          </p>
        </>
      )}
      {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
    </Card>
  );
}

export function WalletPanel() {
  const { user } = useAuth();
  return user ? <WalletForm key={user.id} userId={user.id} /> : null;
}
