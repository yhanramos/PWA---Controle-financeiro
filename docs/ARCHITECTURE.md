# Arquitetura

## Estado atual

Etapa 1 implementada: aplicação client-side React/TypeScript/Vite; arquitetura por funcionalidades; layout mobile-first; rotas com carregamento sob demanda; infraestrutura de query, validação, PWA e cliente Supabase opcional. O dashboard inicial usa placeholders explícitos, sem séries inventadas. O seletor de mês usa calendário em UTC para aritmética e obtém o mês atual em America/Sao_Paulo.

Stage 2 database artifact: `supabase/migrations/20261029000100_initial_schema.sql` defines the initial schema, ownership constraints, grants, RLS, Auth initialization and financial audit. The user confirmed application; official remote types and read-only catalog inspection confirm the expected tables and security configuration. Behavioral tests remain pending. Profile persistence and category read services are implemented. See `DATABASE.md` for the distinction between row constraints already authored and transactional business rules still required.

The Supabase React Router registry block has been installed with `@supabase/ssr`. Its browser entry at `src/lib/client.ts` is adapted to reuse the existing validated SPA singleton rather than creating a second cookie-backed client. The server helper at `src/lib/server.ts` is reserved for actual server loaders/actions and is not imported by the Vite browser application. Installing this helper does not enable SSR or authentication. User-provided public connection settings live only in ignored `.env.local`; the remote schema and RLS configuration have been inspected via authenticated CLI; behavioral RLS tests remain pending.

## Responsabilidades

- `app`: composição, layout, rotas e providers.
- `features`: componentes e, futuramente, hooks e serviços específicos de cada domínio.
- `components/ui`: componentes locais no padrão shadcn/ui, Radix Slot e CVA.
- `components/shared`: estados e apresentação comuns.
- `lib`: validadores, utilitários puros e integração Supabase.
- `services`: infraestrutura compartilhada. Guardas de conectividade devem ser chamados antes de qualquer mutação futura.

Nenhum gerenciador global de estado foi adicionado. TanStack Query usa cache em memória, retry de uma tentativa para leituras e zero para mutações. Mutações não são enfileiradas offline: `networkMode: always` exige validação de conectividade na operação. AuthProvider clears QueryClient on logout, identity changes and failed session validation. Profile/category query keys include userId and reads propagate abort signals. A per-operation data client captures the current JWT and rejects stale user IDs. See PERSISTENCE.md.

## Design system

Tokens CSS em `_tokens.scss` definem cores, tipografia e espaçamento. `_primitives.scss` fornece herança SCSS por placeholders. `app.scss` usa nesting e `@extend`; Tailwind 4 fica numa entrada CSS separada para evitar incompatibilidade de processamento com Sass. Tema escuro padrão; não há alternância de tema nesta etapa. Ícones Lucide são acompanhados por rótulos; botões só de ícone têm nomes acessíveis. Foco visível, skip-link e redução de movimento são tratados.

## Fronteira de segurança

Only /login is public. RequireAuth waits for Supabase Auth user verification before rendering application routes. The SDK persists tokens in browser localStorage and refreshes them automatically. Financial records are not persisted locally. Client guards do not replace RLS; remote policy validation remains pending. See AUTH_SECURITY.md for details. Configuração pública não prova que o backend esteja disponível. Segredos de Gemini ficam exclusivamente no backend.

## PWA

Workbox faz precache de recursos estáticos gerados. Não há runtimeCaching de APIs, persistência local de dados financeiros ou envio offline. Atualização do aplicativo pede ação do usuário. Falhas de navegação têm boundary; falhas de rede terão tratamento adicional nos futuros hooks. `navigator.onLine` é apenas um sinal preliminar.

## Verificação

Lint e verificação de tipos podem ser executados. Build e testes estão proibidos pelas instruções atuais. Manifest, funcionamento do service worker, instalação e comportamento visual em navegador precisam de validação posterior; configuração não equivale a validação de produção.
