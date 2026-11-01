# Plano de execução — Etapa 3

## Ordem e critérios de entrega

1. Fluxos básicos: contas, categorias, receitas e despesas. Formulários validados, valores em reais convertidos para centavos, consultas paginadas, identidade nas chaves de cache, gravações confirmadas e mensagens de erro.
2. Faturas: calendário explícito, compras no crédito, total derivado dos itens, pagamentos parciais e estornos atômicos, rejeição de pagamentos acima do saldo, bloqueio de alterações incompatíveis com liquidações.
3. Parcelamentos: criação atômica de todo o cronograma, divisão inteira dos centavos, importação de parcelas históricas, antecipação com desconto autorizado pelo cartão e cancelamento consistente.
4. Recorrências: calendário ancorado na data original, geração limitada e idempotente, edição das próximas ocorrências e encerramento sem modificar liquidações passadas.
5. Edição e cancelamento: preservar auditoria, impedir exclusão física e verificar os estados permitidos em cada módulo.

## Validação e aplicação

- Não executar build nem testes conforme instrução do usuário. Lint e TypeScript podem ser executados.
- A validação RLS foi confirmada pelo usuário. Edição e troca de perfis foram verificadas no navegador.
- A migration 20261031000100 ainda é rascunho: não aplicar até a revisão completa.
- Não marcar a etapa concluída enquanto existirem fluxos desabilitados ou somente visuais.

## Progresso

- Em andamento: fluxos básicos e revisão dos serviços legados.
- Pendentes: faturas, parcelamentos, recorrências e revisão geral de edição/cancelamento.

## Faturas — implementação local

- Tela `/faturas` com filtros por cartão/mês, totais derivados de compras e parcelas ativas, pagamentos e histórico de estornos.
- Migration `20261031000200_invoice_payments.sql`: pagamentos parciais com trava da fatura, idempotência com comparação do pedido, validação da conta/data/saldo, estorno auditável e bloqueio da alteração de itens após pagamento.
- Contratos RPC locais em `migration.types.ts`; não confundir com os tipos gerados do schema remoto.
- Migration não aplicada nem executada. Não executar o conjunto ainda: criação de faturas/compras, integração com o cronograma de parcelas e revisão SQL permanecem pendentes.
- TypeScript verificado sem emissão. Build e testes não executados.

## Parcelamentos — implementação local

- Cadastro conectado ao RPC, seleção de cartão/categoria, valor em reais, quantidade original, histórico pago e datas explícitas da primeira fatura restante.
- Consulta paginada de planos e cronogramas reais. Não há criação de caixa fictício para parcelas históricas.
- Migration 20261031000100 reescrita (o rascunho não foi aplicado): geração atômica de plano/faturas/parcelas, comparação idempotente e bloqueio de escrita direta de planos/parcelas por clientes.
- Pendentes neste módulo: antecipação, edição/cancelamento e validação do SQL no banco. Não aplicar ainda o conjunto incompleto da Etapa 3.

## Ações de parcelamentos e recorrências — implementação local

- Parcelamentos: edição de descrição/observações com versão otimista; cancelamento atômico do plano e parcelas; parcelas em faturas com pagamentos exigem estorno antes do cancelamento.
- Antecipação: cartão precisa permitir; usuário escolhe uma fatura aberta e sem pagamentos do mesmo cartão. Parcelas em faturas posteriores abertas, ainda não antecipadas e sem pagamentos, são movidas e liquidadas na mesma transação. Desconto distribuído em ordem de parcela, sem exceder o valor individual. Competência original preservada. Desconto de 100% não cria pagamento de valor zero.
- Recorrências sem crédito: cadastro, geração idempotente, alteração de valor/descrição/data final e encerramento. Ocorrências geradas são previstas e não são reescritas pela edição da regra. Encerramento impede novas gerações sem cancelar lançamentos existentes.
- Limites de geração: até dois anos à frente e 10.000 posições na série. Datas de meses/anos são sempre calculadas a partir da âncora original.
- Novas migrations 003 e 004 e contratos RPC locais. Ainda não aplicadas ou executadas.
- Permanecem pendentes no escopo geral: compras avulsas/recorrências no crédito, edição/cancelamento dos lançamentos e cadastros básicos, revisão integrada e validação comportamental das migrations.

## Operações de crédito — implementação local

- Tela `/compras-credito` com seleção de cartão, categoria de despesa, valor, data e ajuste opcional do mês da fatura; acesso pelo menu.
- Cadastro atômico de compra e fatura com comparação idempotente do pedido.
- Recorrências aceitam crédito e geram despesas lançadas nas faturas, sem movimentação duplicada de caixa.
- Tipos locais incluem o novo RPC. Migration `20261031000500_credit_operations.sql` preparada, mas ainda não aplicada nem executada.
- Pendência geral atualizada: operações de crédito implementadas em código; ainda faltam edição/cancelamento dos lançamentos e cadastros básicos e revisão/validação integrada do conjunto SQL.

## Entrega dos três itens — 2026-11-01

Os itens abaixo substituem as pendências equivalentes registradas nas seções históricas acima:

- Implementado: edição de descrição, valor, categoria, datas, conta/situação de receitas e despesas; cancelamento com confirmação e preservação do histórico. No crédito, conta, forma de pagamento e fatura são preservadas; as proteções da fatura impedem alterar compras já pagas sem estorno.
- Implementado: edição e ativação/desativação de contas, categorias e cartões. Tipo de categoria é imutável para preservar vínculos. Mudanças de fechamento/vencimento do cartão não reescrevem faturas existentes.
- Implementado: cadastro de categorias pela interface, com nome, tipo e cor, validação e consulta paginada.
- Operação de edição versionada no banco: `20261031000600_record_editing.sql`, com lista explícita de campos, proprietário autenticado, conferência da versão e auditoria. Clientes não podem contornar a operação com UPDATE direto.
- Cadastros possuem validação explícita e identificador reutilizado após falha de rede. Leitura paginada evita truncar após 200 registros.
- TypeScript e ESLint passaram. Formatação aplicada. Build e testes não executados. Migrations não aplicadas; validação de ponta a ponta no banco continua pendente.

## SQL entregue para aplicação — 2026-11-01

Conjunto consolidado em `supabase/sql-editor/ETAPA_3_COMPLETA.sql` (seis migrations, uma transação), destinado ao banco com a instalação inicial já aplicada e nenhuma evolução da Etapa 3 aplicada. Revisão estática corrigiu delimitador inválido da função de referências e bloqueou colisão da chave de pagamento na antecipação. O pacote está preparado para a aplicação pelo usuário; as indicações históricas de rascunho acima foram superadas por esta entrega. A aplicação e a validação comportamental ainda não foram realizadas.

## Aplicação e primeira validação — 2026-11-01

O usuário apresentou a mensagem de sucesso do pacote completo no Supabase SQL Editor. A CLI autenticada regenerou os tipos remotos com as dez funções públicas da Etapa 3. O cliente agora deriva seus contratos desses tipos, mantendo apenas as duas correções de nulabilidade explicitamente aceitas pelo SQL.

Validação manual no navegador, na segunda conta de teste: criar categoria, editar nome pela função `edit_financial_record`, desativar e recarregar. Todos concluídos com persistência. O registro “Validação etapa 3 — concluída” permaneceu inativo na conta de teste para preservar auditoria. Nenhum lançamento financeiro foi criado nesta rodada. Fluxos de valores, faturas, parcelamentos, recorrências e concorrência seguem pendentes de validação.

Esta confirmação supera as notas históricas de migration não aplicada. Não executar novamente o pacote.

## Validação financeira parcial — 2026-11-01

Na segunda conta de teste, foram confirmados pelo navegador: cadastro da conta QA Financeiro 01-11 com saldo inicial de R$ 1.000,00; criação de receita de R$ 123,45, edição para R$ 124,46 e cancelamento; cadastro do cartão QA Cartão 01-11. A compra QA Crédito 01-11 foi submetida, mas sua confirmação não foi observada antes da solicitação de commit. Os registros de validação foram preservados para auditoria.

Permanecem pendentes: conclusão da validação de crédito, pagamentos e estornos de faturas, despesas, parcelamentos, antecipação e recorrências. Este commit não representa validação integral da Etapa 3. Build e testes automatizados não foram executados.
