# Financial assistant

Fase 1 da Etapa 5 implementada em código. Consultas de saldo e resumo mensal por vencimento; ainda não cria nem altera registros financeiros. Veja [contrato e limitações](../../../docs/AI_INTEGRATION.md).

## Ativação pendente

1. Aplicar **somente** `supabase/migrations/20261106000100_ai_read_assistant.sql` no banco que já recebeu as migrations anteriores. Não reaplicar o pacote inicial/Etapa 3. A nova migration revoga INSERT direto de chat do navegador; somente o backend confirma mensagens do assistente.
2. Em Supabase → Edge Functions → Secrets, configurar `GEMINI_API_KEY`, `GEMINI_MODEL` (modelo disponível com Structured Outputs) e `AI_ALLOWED_ORIGINS` (ex.: `http://localhost:5173`, incluindo a origem HTTPS quando houver deploy). Não colocar valores em `VITE_*` nem no repositório.
3. A função utiliza `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` fornecidos pelo ambiente Supabase. A chave de serviço nunca vai para o frontend.
4. Publicar `financial-assistant` com a CLI autenticada: `supabase functions deploy financial-assistant`. Manter verificação JWT do gateway por padrão; a função também valida o usuário. Caso a configuração de assinatura do projeto exija ajuste do gateway, seguir a documentação oficial sem remover `getUser` da função.
5. Após autorização de validação, verificar autenticação, limites, isolamento, repetição, respostas bloqueadas do modelo e uma consulta real. Não liberar como integração validada antes disso.

Dependências Deno fixadas em `deno.json`. Frontend não requer chave Gemini. Sem deploy, migration, execução Deno ou chamada real ao provedor nesta entrega. `tsc --noEmit` do projeto não cobre o runtime Deno; ESLint cobre a sintaxe da função. Não executar build/testes sem nova autorização.
