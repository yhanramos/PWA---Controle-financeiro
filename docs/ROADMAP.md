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
- [ ] Verify RLS isolation when authorized.
- [x] Generate official remote schema types and type Supabase clients.
- [x] Implement user-scoped profile read/update and category reads with query cancellation, runtime validation and UI states.
- [ ] Validate profile editing and account-change behavior in the browser when authorized.

Migrations, constraints, índices, RLS, tipos gerados, Supabase Auth por e-mail/senha, rotas protegidas, ciclo de sessão, isolamento do cache e serviços persistentes. Validar acesso com dois usuários e referências cruzadas antes de módulos financeiros.

## Etapa 3 — Módulos financeiros

Contas, categorias, cartões, receitas, despesas, parcelamentos, faturas e recorrências. Implementar regras puras e operações atômicas/idempotentes; criar testes críticos junto de cada regra.

Implementação entregue e fluxos principais validados manualmente em 01/11/2026. Resultados, valores e limites estão em [STAGE3_VALIDATION.md](STAGE3_VALIDATION.md). Pronto para iniciar a Etapa 4; validações automatizadas, concorrência e produção continuam pendentes para a etapa de qualidade, sem execução de build ou testes nesta rodada.

## Etapa 4 — Dashboard

Consultas reais, indicadores de caixa/competência/projeção, Recharts, filtros por mês e próximos vencimentos. Estados de loading, erro e vazio vinculados a consultas reais.

1. Saldo de caixa atual: implementado em 02/11/2026, com composição, carregamento, erro/repetição e ausência de contas. Não depende do mês selecionado nesta fase.
2. Indicadores mensais: implementados em 02/11/2026. Receitas e despesas fora do crédito ainda pendentes por vencimento; total líquido das faturas e valor em aberto. Consultas autenticadas/paginadas, estados de carregamento/erro/vazio e integração ao seletor mensal. Casos de domínio escritos, sem execução. Nenhuma migration adicional.
3. Gráficos Recharts: implementados em 02/11/2026. Barras de entradas/saídas realizadas em seis meses e rosca por categoria/competência do mês selecionado; valores em reais, tabela/lista acessível e estados de carregamento, erro e vazio. Sem migration adicional.
4. Projeção: implementada em 02/11/2026. Caixa atual mais pendências até o fim do mês selecionado, incluindo atrasados; composição detalhada, saldo negativo e indicação de não aplicabilidade a meses passados. Recorrências não geradas não são projetadas. Sem migration adicional.
5. Próximos vencimentos: pendente.
6. Filtro mensal integrado e revisão dos estados: pendente.

Fase 1 reutiliza as tabelas existentes; nenhuma migration adicional. Casos de cálculo escritos, mas não executados. Build e testes continuam proibidos pelas instruções atuais.

## Etapa 5 — Inteligência artificial

Edge Function autenticada, Gemini, ferramentas autorizadas, schemas, limites de uso, idempotência, confirmações e chat persistente.

## Etapa 6 — Validação e deploy

Executar verificações após autorização, revisar segurança e isolamento, validar responsividade/acessibilidade, PWA em Android/iOS, conexão instável, cache/atualização, comportamento de logout e configurar hospedagem HTTPS com fallback SPA. Nenhum deploy está incluído na primeira execução.

## Verificação da fase 1 da Etapa 4 — 02/11/2026

TypeScript (tsc --noEmit) e ESLint dos arquivos alterados passaram. Conferência visual no navegador autenticado: saldo de R$ 0,00 e composição zerada na conta QA após os cancelamentos/estornos da rodada anterior, com referência em 02/11/2026. Nenhuma mutação financeira nesta conferência. Os cenários não nulos, de falha e de concorrência não foram exercitados no navegador nesta fase; os testes de domínio foram escritos, sem execução. Build não executado.

## Verificação da fase 2 da Etapa 4 — 02/11/2026

TypeScript (tsc --noEmit) e ESLint do dashboard passaram. No navegador autenticado da conta QA, conferidos indicadores zerados de novembro, mudança para outubro com carregamento e ausência de faturas, e retorno a novembro. Nenhuma mutação financeira realizada. Casos de cálculo escritos para pagamentos/estornos, descontos, parcelas movidas, cancelamentos, virada de mês, zero e limites; não executados. Valores não nulos, erros de rede e concorrência não foram exercitados no navegador. Build e testes não executados.

## Verificação da fase 3 da Etapa 4 — 02/11/2026

TypeScript (tsc --noEmit) e ESLint do dashboard passaram. Navegador autenticado da conta QA: carregamento e estados vazios de caixa/competência confirmados com dados reais, sem criar movimentações. Renderização com séries não zeradas e interações dos gráficos ainda não verificadas no navegador. Casos de cálculo escritos para separação caixa/competência, estornos, cancelamentos, antecipação, descontos, virada de ano e limites; não executados. Nenhum build ou teste executado.
