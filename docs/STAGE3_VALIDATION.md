# Validação manual da Etapa 3 — 2026-11-01

Validação realizada pela interface em `localhost:5173`, autenticada na segunda conta de teste, usando o Supabase real. Registros identificados com prefixo QA. Nenhum pagamento bancário real: as operações registram movimentações no aplicativo.

## Resultados observados

| Fluxo | Evidência | Resultado |
| --- | --- | --- |
| Conta e receita (rodada anterior) | Conta com saldo inicial de R$ 1.000,00; receita criada por R$ 123,45, editada para R$ 124,46 e cancelada | Aprovado |
| Categoria (rodada anterior) | Cadastro, edição do nome, desativação e persistência após recarregar | Aprovado |
| Compra no crédito | Compra de R$ 10,01 em 01/11, vencimento em 20/11; edição para R$ 10,02 e cancelamento após estorno | Aprovado |
| Pagamento acima do saldo | Tentativa de R$ 10,02 sobre dívida de R$ 10,01 rejeitada, sem pagamento criado | Aprovado |
| Pagamento parcial | R$ 4,00 pagos; saldo em aberto de R$ 6,01 | Aprovado |
| Proteção de compra paga | Cancelamento rejeitado enquanto o pagamento estava confirmado | Aprovado |
| Estorno | Pagamento de R$ 4,00 marcado como estornado; dívida voltou a R$ 10,01 | Aprovado |
| Parcelamento | R$ 10,00 em três parcelas: R$ 3,34, R$ 3,33 e R$ 3,33 | Aprovado |
| Edição de plano | Descrição alterada para QA Parcelas editadas | Aprovado |
| Antecipação | Parcelas futuras de R$ 6,66 movidas para novembro; desconto de R$ 0,66; pagamento de R$ 6,00; total da fatura de R$ 9,34 e restante de R$ 3,34; competências dezembro/janeiro preservadas | Aprovado |
| Cancelamento do plano | Após estorno de R$ 6,00, cancelamento confirmado e faturas zeradas | Aprovado |
| Histórico de parcelas | Compra de R$ 10,00 em três parcelas com duas históricas gerou somente parcela 3/3 de R$ 3,33; cancelamento confirmado | Aprovado |
| Recorrência mensal | Datas 31/01/2027, 28/02/2027 e 31/03/2027; fevereiro não deslocou a âncora de março | Aprovado |
| Geração repetida | Primeira geração criou duas ocorrências; repetir o horizonte criou zero | Aprovado |
| Edição de recorrência | Janeiro/fevereiro preservaram R$ 2,01; março ainda não gerado recebeu R$ 3,02 | Aprovado |
| Encerramento | Regra passou a encerrada, geração desabilitada, lançamentos existentes preservados | Aprovado |
| Despesa | Cadastro previsto de R$ 7,01, edição/liquidação para R$ 7,02 em 01/11 e cancelamento | Aprovado |
| Crédito recorrente | Ocorrência no fechamento de 10/11 gerou R$ 1,01 na fatura com vencimento em 20/12; repetição criou zero duplicatas | Aprovado |
| Conta | Edição do nome/saldo inicial, desativação e reativação confirmadas | Aprovado |
| Cartão | Edição do nome/fechamento, desativação e reativação confirmadas; faturas existentes preservaram fechamento no dia 10 após cartão mudar para dia 11 | Aprovado |

## Estado final dos registros de validação

- Lançamentos QA e ambos os parcelamentos cancelados; duas recorrências encerradas e suas ocorrências canceladas.
- Pagamentos de R$ 4,00 e R$ 6,00 estornados, com histórico preservado.
- Faturas de novembro/2026, dezembro/2026 e janeiro/2027 com total, pago e em aberto iguais a zero, confirmados após nova navegação.
- Conta QA Financeiro validado com saldo inicial zerado e inativa. Cartão QA Cartão validado inativo. Categoria de validação anterior permanece inativa.
- Nenhuma exclusão física, alteração de migration ou mudança de código foi necessária nesta rodada.

## Limites e encaminhamento

Os fluxos funcionais acima foram validados manualmente e permitem avançar para a implementação do dashboard da Etapa 4. Não equivalem a regressão exaustiva, teste de carga/concorrência, falha de rede, todos os casos de calendário ou nova validação RLS entre duas sessões. Essas verificações permanecem no escopo de qualidade antes do deploy. Os erros de regra observados exibem mensagem genérica de cadastro; as operações foram corretamente rejeitadas.

Build e suítes automatizadas não foram executados, conforme instrução do projeto. Nenhuma migration adicional é necessária para os cenários desta rodada. Não reaplicar o pacote SQL já executado.
