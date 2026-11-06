# Integração com IA — Etapa 5 em andamento

## Fase 1 implementada em código — 06/11/2026

Chat conectado à Edge Function `financial-assistant`, com histórico real das últimas 40 mensagens, estados de carregamento/erro e repetição com a mesma chave. Não existe resposta simulada. A função autentica via `auth.getUser`, interpreta a pergunta com Gemini Structured Outputs e aceita somente `summary`, `help` ou `unsupported`. Cada pergunta é independente; o histórico não é enviado ao modelo. A mensagem digitada é enviada ao Google; os dados consultados no banco não são enviados automaticamente ao modelo.

A ferramenta `ai_financial_overview` calcula caixa atual e pendências do mês por vencimento sob JWT/RLS. A resposta numérica é formatada deterministicamente, sem narrativa financeira gerada pelo modelo. O resumo é explicitamente por vencimento: não confundir com faturas do ciclo atual, próximas recorrências ou saldo após contas do dashboard. Cancelamentos/estornos seguem as regras financeiras; não há SQL arbitrário nem gravação de lançamentos.

Migration nova `20261106000100_ai_read_assistant.sql`: reservas idempotentes em tabela privada, 5 solicitações/minuto e 20/dia por usuário, teto global de 500/dia (janela diária do banco), e gravação atômica das mensagens/resposta pela função exclusiva do backend. Falhas também consomem reserva. Uma requisição em processamento/falha nunca refaz automaticamente a chamada; histórico pode ser atualizado, ou usuário pode iniciar nova tentativa com nova chave. Máximo de 2.000 caracteres por pergunta, corpo de 12 KB, uma chamada Gemini por reserva, 256 tokens de saída, timeout de 20 segundos. Limites por contagem reduzem consumo, mas não equivalem a orçamento monetário: configurar também quotas do provedor.

Retenção: registros com mais de 30 dias são removidos na próxima reserva; não há job de limpeza em segundo plano. O frontend informa essa política. A chave de serviço é usada apenas para finalizar histórico de uma reserva do usuário já autenticado; consultas financeiras usam cliente sob JWT. Sem logs de texto financeiro, tokens ou conversas. CORS exige origens explícitas, respostas usam `no-store`; frontend renderiza texto escapado.

**Ainda não ativada no Supabase:** migration preparada, não aplicada; função não publicada; nenhuma chamada real a Gemini, SQL executado ou validação de ponta a ponta. TypeScript do frontend e ESLint passaram; runtime Deno e SQL ainda exigem validação no ambiente apropriado. Build e testes não executados. Instruções de ativação em `supabase/functions/financial-assistant/README.md`.

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
