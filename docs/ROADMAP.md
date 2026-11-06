# Roadmap

## Etapa 1 — Fundação (código entregue)

- [x] Inspeção da pasta vazia e leitura do pedido.
- [x] React/TypeScript/Vite, aliases e arquitetura por funcionalidades.
- [x] Tailwind, componentes no padrão shadcn/ui, SCSS por herança.
- [x] Router, QueryClient, ESLint, Prettier e setup de Vitest/Testing Library.
- [x] Layout responsivo, rotas e estados iniciais sem dados fictícios.
- [x] Cliente Supabase opcional e validação de ambiente.
- [x] Manifest, ícones, service worker configurado e tela offline.
- [x] Documentação inicial.
- [ ] Validar build, testes e instalação PWA quando autorizado.

## Etapa 2 — Banco e autenticação

- [x] Author initial SQL migration: schema, constraints, indexes, grants, RLS, user/category initialization and financial audit.
- [x] Author SQL regression scenarios (not executed).
- [x] User confirmed migration application; remote tables, RLS policies, grants and triggers inspected read-only on 2026-10-30.
- [x] Implement email/password login, session restoration, guarded routes and logout with cache isolation.
- [x] Real login confirmed working by the user on 2026-10-30.
- [x] Verify RLS isolation when authorized.
- [x] Generate official remote schema types and type Supabase clients.
- [x] Implement user-scoped profile read/update and category reads with query cancellation, runtime validation and UI states.
- [ ] Validate profile editing and account-change behavior in the browser when authorized.

Migrations, constraints, índices, RLS, tipos gerados, Supabase Auth por e-mail/senha, rotas protegidas, ciclo de sessão, isolamento do cache e serviços persistentes. Validar acesso com dois usuários e referências cruzadas antes de módulos financeiros.

## Etapa 3 — Módulos financeiros

Melhoria de 06/11/2026: Movimentações permite recorrência mensal pelo dia do vencimento, com data final opcional e geração inicial de até 12 ocorrências previstas. Data efetiva removida do cadastro avulso; liquidados usam a data da ocorrência. Reutiliza regras/geração idempotentes existentes e informa falha parcial. TypeScript e ESLint verificados; casos de calendário escritos, sem executar build ou testes. Conferência visual e validação real do novo fluxo pendentes.

Contas, categorias, cartões, receitas, despesas, parcelamentos, faturas e recorrências. Implementar regras puras e operações atômicas/idempotentes; criar testes críticos junto de cada regra.

Implementação entregue e fluxos principais validados manualmente em 01/11/2026. Resultados, valores e limites estão em [STAGE3_VALIDATION.md](STAGE3_VALIDATION.md). Pronto para iniciar a Etapa 4; validações automatizadas, concorrência e produção continuam pendentes para a etapa de qualidade, sem execução de build ou testes nesta rodada.

## Etapa 4 — Dashboard

Saldo após as contas (06/11/2026): novo indicador subtrai do caixa atual as despesas pendentes e o saldo em aberto das faturas consideradas no resumo, incluindo próximas recorrências selecionadas. Pagamentos não são descontados duas vezes; receitas previstas não entram. Mostra composição e insuficiência quando negativo. TypeScript e ESLint passaram; casos de cálculo escritos, sem execução de build ou testes. Validação visual pendente.

Recorrências futuras no resumo atual (06/11/2026): inclui a próxima ocorrência gerada de cada regra sem ocorrência válida no mês atual, mantendo vencimentos reais e evitando somar toda a série. O indicador informa o subtotal incluído. Casos de regressão escritos para parcela em dezembro, não duplicação e cancelamentos; sem execução de testes/build. TypeScript e ESLint passaram; conferência visual pendente.

Resumo de despesas em 06/11/2026: indicador “Despesas totais do mês” soma despesas fora do crédito (previstas e liquidadas por vencimento, incluindo recorrências geradas) às compras/parcelas das faturas consideradas pelo dashboard. Exibe composição, preserva o total após pagamento e evita dupla contagem de crédito. Sem alteração do banco. TypeScript e ESLint passaram; casos em `monthly-expenses.test.ts` escritos, sem execução. Build e validação visual não executados.

Ajuste de 06/11/2026: no mês atual, o indicador de faturas passa a acompanhar o ciclo em formação por cartão, incluindo compras e parcelas com vencimento no mês seguinte. Mostra datas de fechamento/vencimento; outros meses continuam por vencimento. Projeção e próximos vencimentos preservam as datas reais. Sem migrations ou alteração dos registros. TypeScript e ESLint passaram; casos de regressão escritos em `current-invoices.test.ts`, sem execução. Validação visual pendente.

Melhoria de interface dos parcelamentos em 06/11/2026: cabeçalho com cartão/status, resumo do plano, cronograma expansível com meses por extenso, numeração, valores alinhados e status por parcela. Ações com ícones e confirmação de cancelamento em painel próprio; adaptação para telas estreitas via SCSS com herança (`_installments.scss`). Sem alteração financeira nesta revisão visual. TypeScript e ESLint passaram; build, testes e validação visual no navegador não executados.

Consultas reais, indicadores de caixa/competência/projeção, Recharts, filtros por mês e próximos vencimentos. Estados de loading, erro e vazio vinculados a consultas reais.

1. Saldo de caixa atual: implementado em 02/11/2026, com composição, carregamento, erro/repetição e ausência de contas. Não depende do mês selecionado nesta fase.
2. Indicadores mensais: implementados em 02/11/2026. Receitas e despesas fora do crédito ainda pendentes por vencimento; total líquido das faturas e valor em aberto. Consultas autenticadas/paginadas, estados de carregamento/erro/vazio e integração ao seletor mensal. Casos de domínio escritos, sem execução. Nenhuma migration adicional.
3. Gráficos Recharts: implementados em 02/11/2026. Barras de entradas/saídas realizadas em seis meses e rosca por categoria/competência do mês selecionado; valores em reais, tabela/lista acessível e estados de carregamento, erro e vazio. Sem migration adicional.
4. Projeção: implementada em 02/11/2026. Caixa atual mais pendências até o fim do mês selecionado, incluindo atrasados; composição detalhada, saldo negativo e indicação de não aplicabilidade a meses passados. Recorrências não geradas não são projetadas. Sem migration adicional.
5. Próximos vencimentos: implementados em 06/11/2026. Receitas/despesas pendentes e saldo em aberto das faturas pelo mês selecionado, ordenação por data, indicação de atraso/hoje, expansão da lista e acesso aos módulos. Mesma consulta dos indicadores, sem dupla contagem de parcelas; estados de carregamento, erro/repetição, vazio e atualização.
6. Filtro mensal integrado e revisão dos estados: implementados em 06/11/2026. Retorno ao mês atual, limites do calendário, explicação do alcance de cada indicador e remoção dos placeholders do dashboard. Revisão estática das chaves de consulta, cancelamento, invalidação após mutações e estados. Validação visual e cenários de rede/concorrência continuam na Etapa 6.

Implementação da Etapa 4 entregue; próxima etapa de desenvolvimento: IA (Etapa 5). Não equivale a validação de produção. Nenhuma migration ou configuração adicional. Casos de vencimentos escritos, sem execução; build e testes continuam proibidos.

Verificação de 06/11/2026: `node node_modules/typescript/bin/tsc --noEmit` e `node node_modules/eslint/bin/eslint.js src/features/dashboard` passaram. Prettier aplicado aos arquivos de código/SCSS alterados e `git diff --check` sem erros. Consultas do dashboard usam `networkMode: always` com a guarda de conectividade do cliente, permitindo apresentar erro offline em vez de permanecer no carregamento inicial. Sem execução de build, suítes de teste, mutações financeiras ou conferência visual no navegador nesta rodada.

Fase 1 reutiliza as tabelas existentes; nenhuma migration adicional. Casos de cálculo escritos, mas não executados. Build e testes continuam proibidos pelas instruções atuais.

## Etapa 5 — Inteligência artificial

Fase 1 em código (06/11/2026): chat com histórico, Edge Function autenticada, Gemini como classificador estruturado, ferramenta de consulta financeira por vencimento, reservas idempotentes e limites persistidos. Migration e implantação ainda pendentes; nenhum secret cadastrado, SQL executado ou chamada real ao provedor. Escritas com confirmação, consultas por cartão e validação integrada continuam pendentes. Detalhes em [AI_INTEGRATION.md](AI_INTEGRATION.md). Não considerar a Etapa 5 concluída.

Edge Function autenticada, Gemini, ferramentas autorizadas, schemas, limites de uso, idempotência, confirmações e chat persistente.

## Etapa 6 — Validação e deploy

Executar verificações após autorização, revisar segurança e isolamento, validar responsividade/acessibilidade, PWA em Android/iOS, conexão instável, cache/atualização, comportamento de logout e configurar hospedagem HTTPS com fallback SPA. Nenhum deploy está incluído na primeira execução.

## Verificação da fase 1 da Etapa 4 — 02/11/2026

TypeScript (tsc --noEmit) e ESLint dos arquivos alterados passaram. Conferência visual no navegador autenticado: saldo de R$ 0,00 e composição zerada na conta QA após os cancelamentos/estornos da rodada anterior, com referência em 02/11/2026. Nenhuma mutação financeira nesta conferência. Os cenários não nulos, de falha e de concorrência não foram exercitados no navegador nesta fase; os testes de domínio foram escritos, sem execução. Build não executado.

## Verificação da fase 2 da Etapa 4 — 02/11/2026

TypeScript (tsc --noEmit) e ESLint do dashboard passaram. No navegador autenticado da conta QA, conferidos indicadores zerados de novembro, mudança para outubro com carregamento e ausência de faturas, e retorno a novembro. Nenhuma mutação financeira realizada. Casos de cálculo escritos para pagamentos/estornos, descontos, parcelas movidas, cancelamentos, virada de mês, zero e limites; não executados. Valores não nulos, erros de rede e concorrência não foram exercitados no navegador. Build e testes não executados.

## Verificação da fase 3 da Etapa 4 — 02/11/2026

TypeScript (tsc --noEmit) e ESLint do dashboard passaram. Navegador autenticado da conta QA: carregamento e estados vazios de caixa/competência confirmados com dados reais, sem criar movimentações. Renderização com séries não zeradas e interações dos gráficos ainda não verificadas no navegador. Casos de cálculo escritos para separação caixa/competência, estornos, cancelamentos, antecipação, descontos, virada de ano e limites; não executados. Nenhum build ou teste executado.
