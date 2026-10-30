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
- [ ] Apply and validate the migration in Supabase.
- [x] Implement email/password login, session restoration, guarded routes and logout with cache isolation.
- [x] Real login confirmed working by the user on 2026-10-30.
- [ ] Verify RLS isolation when authorized.
- [ ] Generate schema types and implement persistence services.

Migrations, constraints, índices, RLS, tipos gerados, Supabase Auth por e-mail/senha, rotas protegidas, ciclo de sessão, isolamento do cache e serviços persistentes. Validar acesso com dois usuários e referências cruzadas antes de módulos financeiros.

## Etapa 3 — Módulos financeiros

Contas, categorias, cartões, receitas, despesas, parcelamentos, faturas e recorrências. Implementar regras puras e operações atômicas/idempotentes; criar testes críticos junto de cada regra.

## Etapa 4 — Dashboard

Consultas reais, indicadores de caixa/competência/projeção, Recharts, filtros por mês e próximos vencimentos. Estados de loading, erro e vazio vinculados a consultas reais.

## Etapa 5 — Inteligência artificial

Edge Function autenticada, Gemini, ferramentas autorizadas, schemas, limites de uso, idempotência, confirmações e chat persistente.

## Etapa 6 — Validação e deploy

Executar verificações após autorização, revisar segurança e isolamento, validar responsividade/acessibilidade, PWA em Android/iOS, conexão instável, cache/atualização, comportamento de logout e configurar hospedagem HTTPS com fallback SPA. Nenhum deploy está incluído na primeira execução.
