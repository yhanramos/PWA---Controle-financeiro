# Financial assistant

**Nomes abreviados de cartões:** publicar `index.ts` **e** `card-resolution.ts` na mesma função. No editor do Supabase, adicionar o segundo arquivo ao lado do `index.ts`; pela CLI, a importação inclui o arquivo no deploy. “No Inter” pode resolver “Cartão Inter”; múltiplos cartões compatíveis pedem esclarecimento. Não publicar o arquivo `.test.ts`. Sem migration para este ajuste.

**07/11/2026:** compras usam crédito por padrão; Pix/débito explícitos prevalecem mesmo com cartão mencionado. Sem nome de cartão, aceita somente cartão ativo único; caso contrário pede identificação. Não altera compras anteriores. Republicar o `index.ts` atualizado; esta revisão não adiciona migration.

Etapa 5: consultas de saldo/resumo mensal e registro de despesas avulsas com ou sem cartão. Veja [contrato e limitações](../../../docs/AI_INTEGRATION.md).

## Atualização para despesas pelo chat

**Revisão: conversa temporária.** Depois da migration `002`, aplicar [`20261106000300_ephemeral_ai_chat.sql`](../../migrations/20261106000300_ephemeral_ai_chat.sql) e republicar o `index.ts` atualizado. A `003` remove o histórico textual antigo e deixa somente hashes/estado/confirmacão genérica para reenvios; despesas não são excluídas. Frontend guarda a conversa apenas enquanto a tela está aberta. Não há seletores ou sugestões; cartão identificado é crédito, e pagamento/conta fora do cartão vêm do texto. Não reaplicar migrations que já tiverem sido executadas. Nova ativação ainda não realizada.

Consultas confirmadas pelo usuário com `GEMINI_MODEL=gemini-3.5-flash-lite`. Para ativar as novas escritas:

1. No SQL Editor, executar **somente** [`20261106000200_ai_expenses.sql`](../../migrations/20261106000200_ai_expenses.sql), completa. Requer as migrations anteriores já aplicadas. Não executar arquivos de `tests/`.
2. Republicar esta função com o `index.ts` completo atualizado, preservando `deno.json` e os secrets existentes.
3. Atualizar o frontend. Despesas fora do crédito usam a conta e pagamento informados no texto; compras no crédito exigem nome do cartão. Data omitida significa hoje. Não há confirmação extra para o pedido explícito de registro; informações ausentes impedem gravação.

Nova migration e deploy **não executados nesta rodada**. TypeScript (frontend e verificação estática do arquivo Edge com declaração mínima de Deno) e ESLint passaram. Isso não valida o runtime Deno, SQL ou provedor; testes e build não executados. Casos futuros em `supabase/tests/ai_expenses.sql`. O histórico abaixo refere-se à implantação anterior.

## Ativação pendente

**Atualização de 06/11/2026:** migration aplicada, três secrets confirmados por nome e função publicada. Metadados: `ACTIVE`, versão 1, JWT obrigatório. Não repetir os passos de instalação abaixo; falta verificar a primeira conversa autenticada no aplicativo. Valores dos secrets e resposta do provedor não foram inspecionados.

1. **Aplicada em 06/11/2026; não repetir.** Foi executada somente `supabase/migrations/20261106000100_ai_read_assistant.sql` no banco que já recebeu as migrations anteriores. Não reaplicar o pacote inicial/Etapa 3. A nova migration revoga INSERT direto de chat do navegador; somente o backend confirma mensagens do assistente.
2. Em Supabase → Edge Functions → Secrets, configurar `GEMINI_API_KEY`, `GEMINI_MODEL` (modelo disponível com Structured Outputs) e `AI_ALLOWED_ORIGINS` (ex.: `http://localhost:5173`, incluindo a origem HTTPS quando houver deploy). Não colocar valores em `VITE_*` nem no repositório.
3. A função utiliza `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` fornecidos pelo ambiente Supabase. A chave de serviço nunca vai para o frontend.
4. Publicar `financial-assistant` com a CLI autenticada: `supabase functions deploy financial-assistant`. Manter verificação JWT do gateway por padrão; a função também valida o usuário. Caso a configuração de assinatura do projeto exija ajuste do gateway, seguir a documentação oficial sem remover `getUser` da função.
5. Após autorização de validação, verificar autenticação, limites, isolamento, repetição, respostas bloqueadas do modelo e uma consulta real. Não liberar como integração validada antes disso.

Dependências Deno fixadas em `deno.json`. Frontend não requer chave Gemini. Migration aplicada em 06/11/2026 e conferida por metadados. Sem deploy, execução Deno ou chamada real ao provedor nesta entrega. `tsc --noEmit` do projeto não cobre o runtime Deno; ESLint cobre a sintaxe da função. Não executar build/testes sem nova autorização.
