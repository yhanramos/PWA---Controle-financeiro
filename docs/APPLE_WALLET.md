# Apple Pay via Atalhos

Ativação de backend em 07/11/2026: migration aplicada ao projeto do frontend, função `apple-wallet` publicada e confirmada ACTIVE (versão 1), origens configuradas e permissões RPC conferidas. Tipos remotos regenerados. Frontend preparado para publicação. Ainda falta configuração pessoal no Atalhos e validação no iPhone; nenhuma compra foi criada durante a ativação.

A migration foi aplicada via Management API (`db query --file`), sem registrar histórico da CLI automaticamente. Não reaplicar; conciliar histórico antes de um futuro `db push`.

## Funcionamento

Atalhos → HTTPS → Edge Function `apple-wallet` → RPC atômico → compra na fatura. O PWA não precisa estar aberto ou em segundo plano. Depende do iOS, permissões e internet; não há fila offline ou garantia de entrega. Configure execução imediata. Remova a Visualização Rápida de diagnóstico antes do uso automático.

A captura do usuário mostra Cartão ou Tíquete, Comerciante, Valor e Nome. Valores reais e execução com aparelho bloqueado ainda precisam ser conferidos. O gatilho de aproximação não comprova aprovação/liquidação bancária: conferir compras recusadas/canceladas e estornos. Não há reconciliação com banco.

Suporte inicial: compras avulsas no crédito em BRL. Configure apenas cartões/operações de crédito; não enviar débito ou parcelas como compra avulsa. Sem confirmação de moeda BRL, não enviar operações internacionais. “Qualquer cartão” exige associação distinta por nome recebido. Nomes iguais exigem automações separadas com aliases explícitos. Sem Gemini ou envio ao provedor de IA.

## Ativação

1. **Aplicada:** `supabase/migrations/20261107000100_apple_wallet.sql`. Não reaplicar. Tipos remotos regenerados; novos RPCs são acessados pela função, não pelo cliente tipado do frontend.
2. **Configurado:** `WALLET_ALLOWED_ORIGINS` nos secrets do Supabase: `https://pwa-controle-financeiro.vercel.app,http://localhost:5173`. Sem barra final. Secrets da IA preservados.
3. **Publicada:** `supabase functions deploy apple-wallet`. O `supabase/config.toml` desativa JWT do gateway **somente nesta função**. O handler exige chave válida para compras ou valida JWT via `getUser` para configuração. A `financial-assistant` continua com verificação JWT. Para futuras atualizações pelo editor web, enviar `index.ts`, `payload.ts`, `deno.json`; não enviar `.test.ts`.
4. Atualizar frontend. Em Configurações → Apple Pay pelo Atalhos, associar nome exato da Carteira ao cartão e categoria de despesa. Gerar/copiar a chave. Nunca usar service_role, JWT de sessão ou chave Gemini no Atalho.

## Atalho

1. Obter Cartão ou Tíquete (converter para texto; selecionar Nome se expuser objeto), Comerciante e Valor. Conferir qual texto chega e salvar a associação correspondente no app.
2. Formatar valor como texto decimal sem agrupamento/símbolo monetário, no máximo duas casas. Aceita `35,90` e `35.90`; não arredondar precisão extra. BRL declara moeda da compra, não conversão cambial.
3. Gerar UUID uma vez por compra e guardar na variável Evento. Formatar data da execução em `yyyy-MM-dd`, fuso America/Sao_Paulo. Essa data aproxima a compra; não reconstruir evento antigo com a data atual.
4. Em Obter Conteúdo de URL, usar a URL exibida no app (Supabase, não Vercel), POST, cabeçalhos `Content-Type: application/json` e `X-Wallet-Key` com a chave. Corpo JSON:

| Campo | Tipo | Conteúdo |
| --- | --- | --- |
| event_id | Texto | UUID da variável Evento |
| card | Texto | Cartão ou Tíquete/Nome correspondente à associação |
| merchant | Texto | Comerciante |
| amount | Texto | Valor decimal sem agrupamento |
| currency | Texto | BRL, somente para compras efetivamente em reais |
| occurred_on | Texto | Data yyyy-MM-dd |

5. Resposta `status=created` confirma gravação; `status=duplicate` confirma evento já registrado. Ambas incluem `transaction_id`. Resposta com `error` não confirma sucesso. Durante configuração usar Mostrar Resultado; no uso automático, notificação de resultado sem abrir o PWA e mensagem de erro quando não houver status de sucesso.

## Reenvios e limites

Mesmo UUID/campos retorna o resultado anterior, inclusive com concorrência. Mesmo UUID com campos diferentes é recusado. Não gerar UUID novo ao repetir chamada incerta. Reiniciar todo o Atalho ou dois gatilhos independentes pode duplicar compras: não existe identificador bancário nem deduplicação por valor/data, que descartaria compras legítimas iguais. Sem recuperação automática de eventos perdidos; conferir Movimentações antes de registro manual.

Até 100 novas compras/usuário em janela de 24 horas. Cartão sem associação, cartão/categoria inativos, fatura indisponível, moeda diferente e corpo inválido recusam gravação. Falha de rede pode deixar resultado incerto; consultar Movimentações ou reenviar mesmo evento. Sem assinatura Realtime nova; consultas seguem a atualização ao retornar ao app.

## Segurança

Chave aleatória por usuário, armazenada no servidor somente como SHA-256; rotação/revogação serializadas com escrita. Quem tem a chave pode registrar compras nos cartões associados até revogação, mas não ler extratos, editar ou excluir dados. Chave somente em memória da tela, fora de Query Cache e armazenamento do navegador. Não colocar em URL, captura pública ou Git.

Tabelas privadas com RLS e sem acesso anon/authenticated. Configuração via auth.uid(); recebimento exclusivo service_role, proprietário derivado da chave no banco. Associações e categoria revalidadas. Transação, fatura, auditoria existente e evento atômicos. Retém UUID/hash/ID para impedir repetição; não persiste notificação bruta. Revogar não apaga compras. A chave não comprova origem Apple: autoriza o Atalho do usuário.

Referência: [autenticação de Edge Functions](https://supabase.com/docs/guides/functions/auth).

## Validação

Revisão estática concluída: `tsc --noEmit` do frontend, ESLint dos arquivos TypeScript alterados, verificação TypeScript da função com declaração mínima de Deno e `git diff --check` passaram. Formatação aplicada. Isso não executa nem valida runtime Deno, SQL ou iOS.

Casos em `supabase/tests/apple_wallet.sql` e `supabase/functions/apple-wallet/payload.test.ts` escritos, não executados. Pendentes: SQL real, concorrência, isolamento, rotação, limite diário, falhas após commit, fatura indisponível, iPhone bloqueado/PWA fechado, duas compras iguais legítimas, valores com milhar e nome real do cartão. Build e testes não executados.
