# Migrations

Migration inicial: `20261029000100_initial_schema.sql`.

Para uma instalação nova, abra **SQL Editor → New query**, cole o arquivo inteiro e execute como `postgres`. Execute uma única vez, em um projeto sem estas tabelas da aplicação. O script usa uma transação e não remove tabelas existentes. Não adicione credenciais ao arquivo.

Leia [DATABASE.md](../../docs/DATABASE.md) para o modelo, RLS, instalação e regras ainda pendentes. O usuário confirmou a aplicação no Supabase em 30/10/2026. Os metadados remotos foram inspecionados e os tipos oficiais foram gerados; testes comportamentais não foram executados. Não reaplique esta migration após o sucesso; evoluções devem ser novas migrations versionadas.

O arquivo em `../tests/` é somente uma suíte futura de regressão e não faz parte da instalação. Não executá-lo enquanto testes estiverem proibidos pelo projeto. A consulta em `../inspection/` lê somente metadados, sem modificar dados da aplicação.

## Evoluções locais da Etapa 3 (ainda não aplicadas)

A sequência de dependências dos scripts locais é:

1. `20261031000100_financial_operations.sql`: planos, faturas e parcelas.
2. `20261031000200_invoice_payments.sql`: pagamentos, estornos e proteção dos itens de fatura.
3. `20261031000300_installment_actions.sql`: edição/cancelamento/antecipação dos planos.
4. `20261031000400_recurrence_actions.sql`: geração e edição de recorrências.
5. `20261031000500_credit_operations.sql`: compras e recorrências no crédito.
6. `20261031000600_record_editing.sql`: edição/cancelamento de lançamentos e edição/ativação dos cadastros.

São scripts locais novos; não foram executados nem validados contra o banco neste trabalho. As telas dependem dessas funções para as novas operações. A migration inicial já aplicada não deve ser repetida. Antes de aplicar o conjunto, concluir a revisão integrada SQL e a validação em ambiente apropriado. Os contratos RPC em `migration.types.ts` são locais; regenerar os tipos oficiais depois da aplicação.

## Pacote único para SQL Editor — 2026-11-01

Para o banco que já recebeu somente a migration inicial, foi preparado `../sql-editor/ETAPA_3_COMPLETA.sql`, reunindo as seis evoluções em uma transação. Use o pacote OU os arquivos individuais, nunca ambos. As instruções estão em `../sql-editor/README.md`. Revisão estática concluída para a montagem; execução e validação no PostgreSQL continuam pendentes.
