# Clareza — Controle financeiro pessoal

PWA em português brasileiro para organizar receitas, despesas, cartões e compromissos futuros. **Etapa 1 entregue; base da Etapa 2 integrada ao Supabase.** O usuário confirmou a aplicação do SQL e os metadados remotos foram inspecionados em 30/10/2026. O login por e-mail/senha, a sessão e as rotas protegidas estão implementados no frontend. Persistência financeira pela interface, cálculo de saldos e IA ainda não estão implementados. As telas identificam o estágio de implementação; nenhum valor demonstrativo é apresentado como real.

## Pré-requisitos e instalação

- Node.js 22.12+ (recomendado Node 24 LTS) e npm 10+.
- Projeto Supabase para a próxima etapa. O acesso às rotas internas requer configuração válida e um usuário no Supabase Auth.

```sh
npm install
```

Copie `.env.example` para `.env.local` e preencha:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

Use a chave **publishable** disponibilizada no painel do Supabase. Nunca coloque chaves secretas ou `service_role` em variáveis `VITE_*`. O cliente só é criado se a configuração for válida; isso não verifica conectividade. A migration inicial está disponível conforme instruções abaixo. Reinicie o servidor após alterar variáveis.

O bloco `@supabase/supabase-client-react-router` foi instalado pelo shadcn. O helper `src/lib/client.ts` reutiliza a instância existente em `src/lib/supabase/client.ts`, preservando a validação de ambiente e evitando múltiplos clientes de autenticação. O helper `src/lib/server.ts` é exclusivo para um futuro runtime de servidor; não é importado pela SPA e não cria um backend no Vite. O SDK persiste a sessão no navegador; o aplicativo confirma o usuário no Auth antes de abrir as rotas internas. Os valores locais fornecidos ficam em `.env.local`, ignorado pelo Git; `.env.example` permanece sem valores reais.

```sh
npm run dev
```

## Stack

React 19, TypeScript estrito, Vite 7, Tailwind 4, convenções shadcn/ui com Radix Slot e CVA, React Router 7, TanStack Query 5, Supabase JS, Lucide e SCSS. React Hook Form, Zod, Recharts, Vitest e React Testing Library estão preparados para as próximas etapas. O PWA usa vite-plugin-pwa e Workbox. Versões resolvidas são registradas no lockfile.

Tailwind é processado em `src/styles/tailwind.css`, separado do Sass. Estilos de produto ficam em SCSS com herança via placeholders e `@extend`. Componentes UI são código local customizável; `components.json` configura o shadcn/ui. O formulário de login usa React Hook Form e Zod; formulários e gráficos financeiros ainda não foram criados.

## Estrutura

```text
src/app/               # Layout, rotas e providers
src/components/        # Primitivas UI e estados compartilhados
src/features/          # Telas organizadas por funcionalidade
src/hooks/             # Hooks compartilhados
src/lib/               # Cliente Supabase, validadores e utilitários
src/services/          # Infraestrutura de operações remotas
src/styles/            # Tokens, herança SCSS e entrada Tailwind
src/test/              # Setup de Vitest e Testing Library
src/types/             # Contratos compartilhados
public/                # Ícones instaláveis e favicon
supabase/migrations/   # Migrations a partir da Etapa 2
supabase/functions/    # Backend da IA a partir da Etapa 5
docs/                  # Arquitetura, regras, banco, IA e roadmap
```

## Comandos de qualidade e produção

```sh
npm run lint
npm run typecheck
npm run format:check
npm run test
npm run test:watch
npm run build
npm run preview
```

Os comandos de testes e build estão documentados para uso futuro, mas **não foram executados**, conforme instruções do projeto. Há casos Vitest de proteção de rotas e validação do login, ainda não executados. Casos SQL do schema foram escritos em `supabase/tests/initial_schema.sql`, separados da migration e ainda não executados.

Na instalação, o Vitest foi atualizado para 4.1.12 para eliminar os alertas críticos/moderados da versão inicialmente selecionada. A auditoria restante reporta quatro avisos de baixa severidade na cadeia de desenvolvimento `vite-plugin-pwa → workbox-build → @rollup/plugin-node-resolve → deepmerge`. O registro consultado ainda não oferece uma versão corrigida de deepmerge; não foi aplicado downgrade incompatível sugerido por `audit fix --force`. Reavaliar antes do deploy.

O Node padrão encontrado nesta máquina é 14 e não atende ao projeto. A instalação e as verificações estáticas utilizaram o Node 24 disponível no runtime local do Codex. Configure Node 22.12+ no seu terminal antes de usar os comandos acima. A atualização de dependências foi concluída com npm 11 após falha interna do npm 10.

## Supabase e Gemini

Para criar as tabelas, abra **Supabase → SQL Editor → New query**, copie o conteúdo completo de [`20261029000100_initial_schema.sql`](supabase/migrations/20261029000100_initial_schema.sql) e execute como `postgres`. É um script de primeira instalação, para executar uma única vez em projeto sem estas tabelas. Não exige inserir chaves no SQL. Se já houver tabelas da aplicação, compare o schema antes de aplicar; não remova tabelas para forçar a execução.

O script cria as 10 entidades previstas, `invoice_payments` para evitar dupla contagem de despesas e `financial_audit_log` para histórico de alterações, além de RLS, índices, constraints, perfil e categorias padrão por usuário. Leia [DATABASE.md](docs/DATABASE.md) para instruções, decisões e limites. O usuário aplicou esta migration no Supabase. As 12 tabelas, RLS, políticas e permissões foram inspecionadas por leitura de metadados; não reaplique o script inicial.

Os tipos oficiais foram gerados do schema remoto. Perfil com edição do nome e consulta das categorias reais já usam serviços tipados e TanStack Query. Continua pendente a validação comportamental do RLS entre dois usuários. A autenticação do frontend foi integrada e o usuário confirmou que o login funcionou em 30/10/2026. Regras financeiras atômicas entram na Etapa 3. Nenhuma tela financeira atual acessa banco sem autenticação. Não publicar dados de usuários antes de validar isolamento com RLS.

Na Etapa 5, configurar `GEMINI_API_KEY` em Supabase Secrets e implementar `financial-assistant`. O frontend enviará chamadas autenticadas à Edge Function; não falará diretamente com Gemini. O placeholder de chave em `.env.example` é apenas documentação, não é utilizado pelo frontend.

## PWA e hospedagem

O manifest declara ícones PNG 192/512, maskable e ícone Apple. O service worker usa atualização por confirmação e precache somente de arquivos estáticos. Não há runtime cache de API, persistência de Query Cache, fila de escrita offline ou dados financeiros em armazenamento local. A tela de indisponibilidade reage à conectividade do navegador; requisições reais ainda deverão tratar falhas de rede mesmo quando `navigator.onLine` for verdadeiro.

O service worker fica desativado no desenvolvimento. Após validação autorizada de produção, servir `dist/` em HTTPS e configurar fallback SPA para `index.html`, preservando os arquivos estáticos. Android pode oferecer instalação; no iOS, usar Safari → Compartilhar → Adicionar à Tela de Início. Verificar instalação, atualização e offline em dispositivos reais. Nenhum deploy foi feito nesta etapa.

## Próximo passo

Em **Configurações → Seu perfil**, é possível carregar e salvar seu nome no Supabase. A tela **Categorias** consulta os registros reais da conta e separa receitas/despesas. Os tipos oficiais e a inspeção remota estão documentados em [PERSISTENCE.md](docs/PERSISTENCE.md). Nenhuma alteração de perfil ou dado financeiro foi feita no banco durante esta implementação.

Executar a **Etapa 2 — Banco e autenticação**, conforme [roadmap](docs/ROADMAP.md). Consulte [arquitetura](docs/ARCHITECTURE.md), [banco](docs/DATABASE.md), [regras financeiras](docs/FINANCIAL_RULES.md) e [IA](docs/AI_INTEGRATION.md).

## Login local e segurança

Acesse /login usando uma conta já cadastrada e confirmada no Supabase Auth. O cadastro público e a recuperação de senha ainda não estão implementados. Para criar o primeiro usuário e entender os quatro níveis de segurança, consulte [AUTH_SECURITY.md](docs/AUTH_SECURITY.md). O botão Sair encerra a sessão atual e limpa o cache em memória. O usuário confirmou o funcionamento do login em 30/10/2026; os testes automatizados e a validação comportamental do RLS continuam pendentes. A configuração das políticas no banco foi inspecionada por leitura de metadados.
