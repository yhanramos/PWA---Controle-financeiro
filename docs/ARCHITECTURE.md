# Arquitetura

## Estado atual

Etapa 1 implementada: aplicação client-side React/TypeScript/Vite; arquitetura por funcionalidades; layout mobile-first; rotas com carregamento sob demanda; infraestrutura de query, validação, PWA e cliente Supabase opcional. O dashboard inicial usa placeholders explícitos, sem séries inventadas. O seletor de mês usa calendário em UTC para aritmética e obtém o mês atual em America/Sao_Paulo.

## Responsabilidades

- `app`: composição, layout, rotas e providers.
- `features`: componentes e, futuramente, hooks e serviços específicos de cada domínio.
- `components/ui`: componentes locais no padrão shadcn/ui, Radix Slot e CVA.
- `components/shared`: estados e apresentação comuns.
- `lib`: validadores, utilitários puros e integração Supabase.
- `services`: infraestrutura compartilhada. Guardas de conectividade devem ser chamados antes de qualquer mutação futura.

Nenhum gerenciador global de estado foi adicionado. TanStack Query usa cache em memória, retry de uma tentativa para leituras e zero para mutações. Mutações não são enfileiradas offline: `networkMode: always` exige validação de conectividade na operação. Ao implementar autenticação, limpar o QueryClient no logout/troca de usuário e incluir userId nas query keys.

## Design system

Tokens CSS em `_tokens.scss` definem cores, tipografia e espaçamento. `_primitives.scss` fornece herança SCSS por placeholders. `app.scss` usa nesting e `@extend`; Tailwind 4 fica numa entrada CSS separada para evitar incompatibilidade de processamento com Sass. Tema escuro padrão; não há alternância de tema nesta etapa. Ícones Lucide são acompanhados por rótulos; botões só de ícone têm nomes acessíveis. Foco visível, skip-link e redução de movimento são tratados.

## Fronteira de segurança

Rotas atuais são públicas porque contêm apenas estrutura e documentação. **Não são rotas financeiras protegidas.** A Etapa 2 deve introduzir autenticação, proteção de rotas e RLS antes de expor dados. O cliente atual não persiste sessão. A escolha de persistência da sessão deverá ser revisada na Etapa 2. Configuração pública não prova que o backend esteja disponível. Segredos de Gemini ficam exclusivamente no backend.

## PWA

Workbox faz precache de recursos estáticos gerados. Não há runtimeCaching de APIs, persistência local de dados financeiros ou envio offline. Atualização do aplicativo pede ação do usuário. Falhas de navegação têm boundary; falhas de rede terão tratamento adicional nos futuros hooks. `navigator.onLine` é apenas um sinal preliminar.

## Verificação

Lint e verificação de tipos podem ser executados. Build e testes estão proibidos pelas instruções atuais. Manifest, funcionamento do service worker, instalação e comportamento visual em navegador precisam de validação posterior; configuração não equivale a validação de produção.
