# Integração com IA — Etapa 5 em andamento

## Pagamento padrão — 07/11/2026

Resolução de cartões: `card-resolution.ts` aceita nomes abreviados por palavras completas, removendo acentos, caixa e termos genéricos (cartão/banco/crédito). “Inter” encontra “Cartão Inter”; “Inter” não encontra “Internacional”. Nome completo exato tem prioridade; abreviação com várias correspondências pede identificação, sem salvar. Nome desconhecido nunca cai no cartão único padrão. O prompt preserva a abreviação original e extrai “no inter” como cartão na compra a crédito. O catálogo continua limitado aos cartões ativos do usuário autenticado. Casos em `card-resolution.test.ts` escritos, não executados. Publicar `index.ts` junto de `card-resolution.ts`; sem migration.

Compras usam crédito por padrão. Pix e débito explícitos têm prioridade mesmo com nome de cartão; os dois caminhos exigem conta resolvida. Cartão omitido usa apenas um cartão ativo único; havendo vários, pede identificação. Dinheiro/transferência explícitos e instruções contraditórias são classificados como não suportados, sem convertê-los silenciosamente em crédito. A regra substitui “cartão identificado sempre crédito”. Nenhuma reclassificação de despesas existentes ou migration nesta revisão; republicar `index.ts`. Mensagens continuam temporárias.

## Conversa temporária e cartão como crédito — 06/11/2026

Teclado: Enter envia pelo mesmo formulário do botão; Shift+Enter insere quebra de linha. Composição de texto (IME), repetição da tecla, mensagens vazias e envio em andamento não disparam nova solicitação. Alteração apenas no frontend, sem nova migration ou publicação da Edge Function.

Por solicitação do usuário, mensagens ficam somente no estado React enquanto a tela está aberta. Sair/recarregar limpa a conversa; não há consulta a `chat_messages`, botão de histórico, seletores de pagamento/conta nem bloco de sugestões. O cache da mutação é descartado quando fica inativo (`gcTime: 0`). A rolagem acompanha mensagens locais e mantém a preferência de movimento reduzido.

Cartão identificado como meio de pagamento significa **sempre crédito**. O prompt extrai o nome, e o backend prioriza `credit` quando `expense.card` está preenchido, mesmo se a classificação de pagamento vier diferente. Fora do cartão, conta e pagamento vêm da mensagem; conta única pode ser resolvida automaticamente. Dados ausentes pedem reenvio do gasto completo, sem gravação nem padrões inventados.

Nova migration `20261106000300_ephemeral_ai_chat.sql`, após a `002`: remove mensagens antigas de `chat_messages`; substitui textos nas reservas por SHA-256; troca respostas armazenadas por uma confirmação genérica fixa. Novas finalizações não gravam histórico. Mantém apenas IDs, hash, estado, horários e confirmação genérica para limites e reenvios por até 30 dias (limpeza na próxima reserva). A primeira resposta detalhada vai diretamente para a tela; após perda da resposta, um reenvio concluído retorna confirmação genérica e orienta conferir Movimentações, sem executar novamente. Despesas e faturas continuam persistentes. Não usa armazenamento local do navegador.

Ativação pendente: aplicar `003` (e `002` se ainda não aplicada), republicar a função e atualizar frontend. A migration remove somente conteúdo de conversas, sem excluir lançamentos financeiros. Casos SQL atualizados em `ai_expenses.sql` e `ephemeral_ai_chat.sql`, não executados. As menções abaixo a histórico e seletores descrevem a implementação anterior e são substituídas por esta política.

Verificação desta revisão: TypeScript do frontend e verificação estática da função com declaração mínima de Deno passaram; ESLint dos arquivos TypeScript alterados e `git diff --check` passaram. Sem execução de build, testes, SQL remoto ou validação visual/runtime Deno.

## Despesas pelo chat — 06/11/2026 (código local; ativação pendente)

O usuário confirmou o funcionamento das consultas com `gemini-3.5-flash-lite`. A fase seguinte adiciona `expense`: uma despesa avulsa já realizada por mensagem, salva diretamente conforme solicitação do usuário. Não inclui receitas, parcelas, recorrências, exclusões, pagamentos de fatura ou alterações. Mensagens ambíguas pedem complemento, sem gravação; cada envio deve conter o gasto completo (não há memória de rascunhos conversacionais).

- Sem cartão: conta ativa e Pix/dinheiro/débito/transferência; registra como liquidada. Conta e forma explícitas no texto têm prioridade sobre os seletores do chat. Conta única pode ser selecionada automaticamente; pagamento não é presumido. Seleções ficam apenas na memória da tela.
- Crédito: nome exato de cartão ativo, compra `posted`, fatura determinada por `private.credit_invoice`, sem saída imediata de caixa. Não se usa conta de pagamento neste caminho.
- Data omitida: hoje em America/Sao_Paulo. Datas futuras, valores não positivos/fora da faixa segura e categorias não resolvidas não são gravados. Valores extraídos como string decimal em reais são convertidos por BigInt para centavos.
- Gemini recebe texto e nomes dos cadastros ativos (até 200 por tipo), nunca IDs, saldos ou extratos. Categoria inferida deve corresponder a exatamente uma categoria de despesa ativa. Nomes são dados não confiáveis. O backend resolve os IDs sob JWT/RLS; o RPC revalida propriedade, estado e datas sob bloqueios.
- Nova migration `20261106000200_ai_expenses.sql`: `finish_ai_expense` exclusivo de service_role, com usuário obtido pelo backend via `getUser`. Despesa, eventual fatura, auditoria e duas mensagens são gravadas na mesma transação; erro reverte tudo. Chave da reserva é a chave idempotente da despesa. Reserva concluída devolve a resposta anterior.
- Em falha de rede/resultado incerto, o frontend mantém chave e conteúdo originais e oferece verificar a mesma tentativa; não libera nova tentativa com resultado desconhecido. Erros SQL que comprovam rollback encerram a reserva como falha. Não há reexecução automática de modelo/escrita. Uma reserva abandonada em processamento exige inspeção antes de novo pedido; não expira automaticamente para permitir escrita.
- Sucesso invalida consultas do usuário, incluindo dashboard e movimentações. Resposta transitória, histórico e carregamento agora compartilham a área rolável; novas respostas rolam para o final, respeitando movimento reduzido.

O limite de saída passa de 256 para 2.048 tokens para o objeto de despesa e raciocínio do modelo. Permanecem limite de 2.000 caracteres, timeout de 20 segundos e reservas de 5/minuto, 20/dia e 500/dia globais. Os nomes das opções são limitados; contas com mais de 200 registros ativos em um catálogo recebem erro, sem usar catálogo truncado.

Ativação: aplicar somente a nova migration e republicar o `index.ts` completo; atualizar frontend. Não reaplicar migrations anteriores. Código revisado por TypeScript e ESLint; cenários SQL em `supabase/tests/ai_expenses.sql` escritos, **não executados**. Build, testes, implantação remota e validação visual não executados nesta rodada. As notas abaixo descrevem a fase anterior e são históricas.

## Publicação — 06/11/2026

Após confirmação do usuário, os nomes `GEMINI_API_KEY`, `GEMINI_MODEL` e `AI_ALLOWED_ORIGINS` foram conferidos por metadados, sem exposição dos valores. `financial-assistant` publicada via CLI/Management API; estado `ACTIVE`, versão 1 e `verify_jwt=true` confirmados. Migration já aplicada. Esta atualização supera as notas históricas de secrets/deploy pendentes abaixo. Chamada autenticada real pelo aplicativo, compatibilidade da chave/modelo e resposta do provedor ainda não verificadas; não houve build ou execução de testes.

## Fase 1 implementada em código — 06/11/2026

Chat conectado à Edge Function `financial-assistant`, com histórico real das últimas 40 mensagens, estados de carregamento/erro e repetição com a mesma chave. Não existe resposta simulada. A função autentica via `auth.getUser`, interpreta a pergunta com Gemini Structured Outputs e aceita somente `summary`, `help` ou `unsupported`. Cada pergunta é independente; o histórico não é enviado ao modelo. A mensagem digitada é enviada ao Google; os dados consultados no banco não são enviados automaticamente ao modelo.

A ferramenta `ai_financial_overview` calcula caixa atual e pendências do mês por vencimento sob JWT/RLS. A resposta numérica é formatada deterministicamente, sem narrativa financeira gerada pelo modelo. O resumo é explicitamente por vencimento: não confundir com faturas do ciclo atual, próximas recorrências ou saldo após contas do dashboard. Cancelamentos/estornos seguem as regras financeiras; não há SQL arbitrário nem gravação de lançamentos.

Migration nova `20261106000100_ai_read_assistant.sql`: reservas idempotentes em tabela privada, 5 solicitações/minuto e 20/dia por usuário, teto global de 500/dia (janela diária do banco), e gravação atômica das mensagens/resposta pela função exclusiva do backend. Falhas também consomem reserva. Uma requisição em processamento/falha nunca refaz automaticamente a chamada; histórico pode ser atualizado, ou usuário pode iniciar nova tentativa com nova chave. Máximo de 2.000 caracteres por pergunta, corpo de 12 KB, uma chamada Gemini por reserva, 256 tokens de saída, timeout de 20 segundos. Limites por contagem reduzem consumo, mas não equivalem a orçamento monetário: configurar também quotas do provedor.

Retenção: registros com mais de 30 dias são removidos na próxima reserva; não há job de limpeza em segundo plano. O frontend informa essa política. A chave de serviço é usada apenas para finalizar histórico de uma reserva do usuário já autenticado; consultas financeiras usam cliente sob JWT. Sem logs de texto financeiro, tokens ou conversas. CORS exige origens explícitas, respostas usam `no-store`; frontend renderiza texto escapado.

**Ativação parcial no Supabase (06/11/2026):** migration aplicada por SQL direto via Management API no projeto confirmado como o mesmo do frontend. Tabela e três funções confirmadas por metadados; permissões de authenticated/anon/service_role conferidas. Função Edge ainda não publicada, secrets ainda pendentes e nenhuma chamada real a Gemini ou validação de ponta a ponta. TypeScript do frontend e ESLint passaram; runtime Deno e SQL ainda exigem validação no ambiente apropriado. Build e testes não executados. Instruções de ativação em `supabase/functions/financial-assistant/README.md`.

**Fases seguintes:** consultas por cartão e alinhamento completo com as visões do dashboard; resolver nomes de contas/cartões/categorias; propostas de criação de receitas/despesas/parcelamentos; confirmação vinculada à operação, idempotência transacional e execução de ferramentas de escrita; validação de autorização, concorrência e falhas. A Etapa 5 não está concluída.

## Fluxo previsto

Frontend autenticado → Edge Function financial-assistant → verificação do JWT → limite de uso → Gemini Function Calling/Structured Outputs → validação de schema e autorização → ferramenta financeira explícita → persistência/consulta real → resposta.

O modelo nunca recebe acesso direto ao banco, SQL arbitrário ou chave privilegiada. Ferramentas propostas: consultar resumo, consultar compromissos por cartão, criar receita, criar despesa e criar parcelamento. Seus schemas deverão limitar campos, valores, datas, tamanhos e enumerações. IDs devem ser resolvidos e validados no backend contra o usuário autenticado. Ambiguidades relevantes exigem esclarecimento.

Tratar mensagens e respostas do modelo como dados não confiáveis. Não aceitar user_id fornecido pelo modelo como autorização. Preferir cliente Supabase sob JWT do usuário, mantendo RLS. Idempotência deve ser transacional, persistida e vinculada ao usuário e à requisição. Limites de uso devem ser verificados antes de chamar Gemini; definir orçamento, timeout e limite de ferramentas por turno.

Exclusões e operações sensíveis precisam de confirmação vinculada à operação exata e com validade limitada. Declarar sucesso somente após confirmação de persistência. Não inventar saldos, transações ou categorias. Ferramentas de consulta só retornam dados autorizados e necessários.

## Secrets

`GEMINI_API_KEY` será cadastrada em Supabase Secrets, nunca em variável VITE_. Modelo e limites serão definidos na implementação após verificar documentação atual do provedor. Não registrar chaves ou dados financeiros completos em logs. Definir retenção do histórico e política de tratamento de dados antes de liberar o assistente.

Na fase 1, `GEMINI_MODEL` é obrigatório (sem modelo fixo presumido); selecionar um modelo disponível na conta com suporte a Structured Outputs. `AI_ALLOWED_ORIGINS` contém a origem local e/ou hospedada separadas por vírgula. Nenhum secret foi criado neste trabalho.

Referências oficiais consultadas: [Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output), [Supabase autenticação de funções](https://supabase.com/docs/guides/functions/auth-headers), [Supabase Secrets](https://supabase.com/docs/guides/functions/secrets). Confirmar disponibilidade do modelo na ativação.
