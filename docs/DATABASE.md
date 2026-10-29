# Banco de dados — desenho previsto

**Não há schema implementado nesta etapa.** As migrations começarão na Etapa 2; não executar DDL manual divergente das migrations versionadas.

| Entidade               | Responsabilidade planejada                                      |
| ---------------------- | --------------------------------------------------------------- |
| profiles               | Perfil associado a auth.users                                   |
| accounts               | Contas de caixa do usuário                                      |
| credit_cards           | Nome, instituição, cor, fechamento, vencimento, limite e status |
| categories             | Categorias padrão e personalizadas por usuário                  |
| transactions           | Eventos financeiros, competência e liquidação                   |
| installment_plans      | Compra original, quantidade e histórico informado               |
| installments           | Obrigações individuais de um plano                              |
| credit_card_invoices   | Faturas por cartão e período                                    |
| recurring_transactions | Regra de geração de obrigações                                  |
| chat_messages          | Histórico por usuário com política de retenção                  |

## Requisitos para a Etapa 2

- UUIDs, user_id obrigatório, created_at/updated_at com timezone.
- Dinheiro em centavos inteiros com limites documentados. No JavaScript validar Number.isSafeInteger; se usar BIGINT acima desse limite, serializar como string e operar com bigint.
- Datas de calendário em DATE. Não converter vencimentos para timestamps UTC.
- RLS em todas as tabelas de dados de usuário, com USING e WITH CHECK vinculados a auth.uid().
- Chaves estrangeiras compostas `(user_id, referência)` ou validação equivalente para impedir referências cruzadas entre proprietários. RLS isolada não substitui essa integridade.
- Constraints de domínio, índices por usuário/período/status, unicidade de fatura por cartão/período, parcela por plano/número e ocorrência por regra/data.
- Transações SQL/RPC para gerar parcelas e registrar pagamentos atomicamente.
- Chaves idempotentes por usuário e tipo de operação, verificadas dentro da mesma transação do registro.
- Definir política de cancelamento e auditoria antes de permitir exclusões.

Gerar tipos TypeScript do schema real quando estiver disponível; não tipar tabelas inexistentes como se estivessem prontas. Planejar testes de acesso cruzado com dois usuários antes de liberar operações.
