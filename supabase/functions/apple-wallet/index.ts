import { createClient } from '@supabase/supabase-js';
import { amountInCents, managementSchema, purchaseSchema } from './payload.ts';

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  const allowed = (Deno.env.get('WALLET_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin':
      origin && allowed.includes(origin) ? origin : '',
    'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info, x-wallet-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  const reply = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowed.includes(origin))
    return reply({ error: 'Origem não autorizada.' }, 403);
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers });
  if (request.method !== 'POST')
    return reply({ error: 'Método não permitido.' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service)
    return reply({ error: 'Integração indisponível.' }, 503);
  // Bound streamed bodies too, not only the caller-supplied Content-Length.
  let raw = '';
  try {
    if (!request.body) return reply({ error: 'Corpo obrigatório.' }, 400);
    const reader = request.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        return reply({ error: 'Corpo muito grande.' }, 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const body: unknown = JSON.parse(raw);
    const token = request.headers.get('x-wallet-key');
    if (token) {
      if (!/^wallet_[a-f0-9]{64}$/.test(token))
        return reply({ error: 'Chave inválida.' }, 401);
      const purchase = purchaseSchema.safeParse(body);
      if (!purchase.success)
        return reply(
          {
            error:
              'Confira cartão, comerciante, valor, moeda BRL, data e UUID do evento.',
          },
          400,
        );
      const cents = amountInCents(purchase.data.amount);
      const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(token),
      );
      const hash = Array.from(new Uint8Array(digest), (n) =>
        n.toString(16).padStart(2, '0'),
      ).join('');
      const admin = createClient(url, service, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await admin.rpc('receive_wallet_purchase', {
        p_hash: hash,
        p_event: purchase.data.event_id,
        p_alias: purchase.data.card,
        p_merchant: purchase.data.merchant,
        p_amount: cents,
        p_date: purchase.data.occurred_on,
      });
      if (error) {
        const messages: Record<string, [number, string]> = {
          '28000': [401, 'Chave inválida ou revogada.'],
          '23505': [
            409,
            'Evento já utilizado com outros dados. Confira Movimentações.',
          ],
          '23514': [
            422,
            'Confira a associação do cartão, categoria e disponibilidade da fatura.',
          ],
          '22023': [400, 'Compra inválida. Confira os campos enviados.'],
          '54000': [429, 'Limite de 100 compras por dia atingido.'],
        };
        const [status, message] = messages[error.code] ?? [
          503,
          'Resultado não confirmado. Reenvie somente com o mesmo evento e dados.',
        ];
        return reply({ error: message }, status);
      }
      return reply(data);
    }
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer '))
      return reply({ error: 'Entre novamente.' }, 401);
    const client = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: identity, error: authError } = await client.auth.getUser(
      authorization.slice(7),
    );
    if (authError || !identity.user)
      return reply({ error: 'Entre novamente.' }, 401);
    const input = managementSchema.safeParse(body);
    if (!input.success) return reply({ error: 'Configuração inválida.' }, 400);
    const { data, error } = await client.rpc('manage_wallet', {
      p_action: input.data.action,
      p_alias: input.data.alias ?? null,
      p_card: input.data.card_id ?? null,
      p_category: input.data.category_id ?? null,
    });
    if (error)
      return reply(
        {
          error:
            'Não foi possível configurar. Confira os campos e a ativação da integração.',
        },
        400,
      );
    return reply(data);
  } catch {
    return reply(
      {
        error:
          'Solicitação não confirmada. Confira os dados; em reenvios preserve o UUID original.',
      },
      400,
    );
  }
});
