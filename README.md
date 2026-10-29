# Clareza — Controle financeiro pessoal

PWA em português brasileiro para organizar receitas, despesas, cartões e compromissos futuros. **Esta entrega implementa somente a Etapa 1 — Fundação.** Não existe autenticação, persistência financeira, cálculo de saldos ou IA operante nesta versão. As telas identificam o estágio de implementação; nenhum valor demonstrativo é apresentado como real.

## Pré-requisitos e instalação

- Node.js 22.12+ (recomendado Node 24 LTS) e npm 10+.
- Projeto Supabase para a próxima etapa. Para navegar pela fundação, as variáveis podem permanecer vazias.

```sh
npm install
```

Copie `.env.example` para `.env.local` e preencha:

```dotenv
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
```

Use a chave **publishable** disponibilizada no painel do Supabase. Nunca coloque chaves secretas ou `service_role` em variáveis `VITE_*`. O cliente só é criado se a configuração for válida; isso não verifica conectividade. Não há migrations aplicáveis nesta etapa. Reinicie o servidor após alterar variáveis.

```sh
npm run dev
```

## Stack

React 19, TypeScript estrito, Vite 7, Tailwind 4, convenções shadcn/ui com Radix Slot e CVA, React Router 7, TanStack Query 5, Supabase JS, Lucide e SCSS. React Hook Form, Zod, Recharts, Vitest e React Testing Library estão preparados para as próximas etapas. O PWA usa vite-plugin-pwa e Workbox. Versões resolvidas são registradas no lockfile.

Tailwind é processado em `src/styles/tailwind.css`, separado do Sass. Estilos de produto ficam em SCSS com herança via placeholders e `@extend`. Componentes UI são código local customizável; `components.json` configura o shadcn/ui. Formulários e gráficos financeiros ainda não foram criados.

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

Os comandos de testes e build estão documentados para uso futuro, mas **não foram executados nesta entrega**, conforme instruções do projeto. Ainda não há casos de teste: apenas a infraestrutura. As regras financeiras receberão testes junto de sua implementação; `npm run test` reportará ausência de testes até então.

Na instalação, o Vitest foi atualizado para 4.1.12 para eliminar os alertas críticos/moderados da versão inicialmente selecionada. A auditoria restante reporta quatro avisos de baixa severidade na cadeia de desenvolvimento `vite-plugin-pwa → workbox-build → @rollup/plugin-node-resolve → deepmerge`. O registro consultado ainda não oferece uma versão corrigida de deepmerge; não foi aplicado downgrade incompatível sugerido por `audit fix --force`. Reavaliar antes do deploy.

O Node padrão encontrado nesta máquina é 14 e não atende ao projeto. A instalação e as verificações estáticas utilizaram o Node 24 disponível no runtime local do Codex. Configure Node 22.12+ no seu terminal antes de usar os comandos acima. A atualização de dependências foi concluída com npm 11 após falha interna do npm 10.

## Supabase e Gemini

Na Etapa 2, criar migrations, policies RLS, tipos gerados do schema, autenticação e serviços. Nenhuma tela financeira atual acessa banco sem autenticação. Não publicar dados de usuários antes de validar isolamento com RLS.

Na Etapa 5, configurar `GEMINI_API_KEY` em Supabase Secrets e implementar `financial-assistant`. O frontend enviará chamadas autenticadas à Edge Function; não falará diretamente com Gemini. O placeholder de chave em `.env.example` é apenas documentação, não é utilizado pelo frontend.

## PWA e hospedagem

O manifest declara ícones PNG 192/512, maskable e ícone Apple. O service worker usa atualização por confirmação e precache somente de arquivos estáticos. Não há runtime cache de API, persistência de Query Cache, fila de escrita offline ou dados financeiros em armazenamento local. A tela de indisponibilidade reage à conectividade do navegador; requisições reais ainda deverão tratar falhas de rede mesmo quando `navigator.onLine` for verdadeiro.

O service worker fica desativado no desenvolvimento. Após validação autorizada de produção, servir `dist/` em HTTPS e configurar fallback SPA para `index.html`, preservando os arquivos estáticos. Android pode oferecer instalação; no iOS, usar Safari → Compartilhar → Adicionar à Tela de Início. Verificar instalação, atualização e offline em dispositivos reais. Nenhum deploy foi feito nesta etapa.

## Próximo passo

Executar a **Etapa 2 — Banco e autenticação**, conforme [roadmap](docs/ROADMAP.md). Consulte [arquitetura](docs/ARCHITECTURE.md), [banco](docs/DATABASE.md), [regras financeiras](docs/FINANCIAL_RULES.md) e [IA](docs/AI_INTEGRATION.md).
