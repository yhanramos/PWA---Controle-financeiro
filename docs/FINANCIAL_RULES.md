# Regras financeiras — contrato para implementação

As regras abaixo orientam a Etapa 3; **os fluxos financeiros ainda não estão implementados**. A migration inicial define a representação de dados e algumas constraints/triggers, mas ainda não foi aplicada nem executada.

## Initial schema decisions

- Transactions store standalone/recurring entries; installment purchases live only in plans and installments. Invoice payments are a separate cash event, not a second expense.
- Invoice reference periods use the due month. Actual closing/due dates are explicit; cutoff generation remains pending rather than silently assuming issuer behavior.
- Installment values use integer quotient/remainder allocation. Historical paid counts do not create cash movements. The first unpaid invoice month is explicit. Original plan terms and installment amounts are immutable; corrections require an auditable workflow.
- Discounts require an anticipation date and a card explicitly permitting early settlement. Full settlement, cancellation propagation, overpayment checks and schedule completeness still require atomic RPCs.
- Financial records use statuses instead of client deletion; inserts/updates are audited. Current row state alone is insufficient for historical as-of reports after reversals; preserve audit timestamps in those queries.
- Unique immutable operation keys and recurring occurrence identities prevent duplicate rows when callers reuse the same keys. Retry handling and payload matching still belong to services.

## Domain rules for Stage 3

1. Caixa: saldo inicial mais entradas liquidadas menos saídas liquidadas até a data de referência. Receitas previstas não alteram o caixa.
2. Projeção: caixa na data de referência somado às entradas previstas e deduzido das obrigações futuras ainda abertas até o horizonte. Não somar novamente valores liquidados. Meses anteriores/futuros exigem referências temporais explícitas.
3. Competência: reconhecer despesas na política definida para a ocorrência/parcela, independentemente de saída de caixa.
4. Cartões: compra/parcela registra despesa por competência; pagamento da fatura movimenta caixa e liquida obrigação, sem criar uma segunda despesa por competência.
5. Parcelas: operar em centavos inteiros. Para total T e N parcelas, base = divisão inteira T/N; distribuir um centavo às primeiras T mod N parcelas. Soma deve ser exatamente T. Quantidade positiva; tratar totais inferiores à quantidade explicitamente.
6. Parcelamentos antigos: preservar quantidade original e histórico informado; gerar apenas obrigações futuras. Parcela já paga informada não deve reduzir caixa atual automaticamente.
7. Fechamento: limitar o dia configurado ao último dia de cada mês. Documentar a convenção de compra no próprio dia de fechamento antes de implementá-la, permitindo ajuste de primeira fatura para divergências do emissor.
8. Vencimento: tratar como data local de calendário e limitar o dia ao último dia do mês. Definir o mês de vencimento em relação ao fechamento explicitamente.
9. Antecipação: somente quando permitida; validar desconto entre zero e saldo elegível, registrar liquidação auditável e remover obrigações futuras em uma operação atômica.
10. Recorrências: unicidade por usuário, regra e data da ocorrência; geração idempotente inclusive sob concorrência. Alterações não reescrevem liquidações anteriores.
11. Cancelamentos e correções: recalcular obrigações e projeções sem apagar a trilha de auditoria nem duplicar efeitos de caixa.
12. Formulários: converter strings monetárias para inteiros sem multiplicação de valores decimais binários. Rejeitar entradas inválidas e valores fora da faixa segura.

## Validação futura

Criar casos para centavos residuais, anos bissextos, fechamento/vencimento em dias 29–31, compra no dia do fechamento, transição de ano, receitas previstas/recebidas, fatura paga, importação parcial, antecipação com desconto, cancelamentos e requisições concorrentes idempotentes. Não executar testes enquanto a restrição do projeto permanecer.

## Parcelamentos — criação e calendário

O cadastro solicita explicitamente fechamento e vencimento da primeira fatura ainda devida. As demais datas são calculadas a partir dessas duas âncoras, mês a mês, limitando dias inexistentes ao último dia do mês. Faturas existentes preservam suas datas; se divergirem, a operação inteira é rejeitada para que o usuário confira os dados. A criação não determina automaticamente a fatura pela data da compra. Isso permite ao usuário informar o período correto do emissor, inclusive compra no próprio dia do fechamento.

A migration 20261031000100, ainda não aplicada, foi substituída por uma operação que cria plano, faturas e parcelas atomicamente. Solicitações usam chave estável e comparação integral do pedido. A criação rejeita cartão/categoria inativos, faturas fechadas/canceladas/pagas e distribui centavos pelas primeiras parcelas originais. Importação gera somente parcelas posteriores ao histórico informado.

## Edições, antecipação e recorrências

A edição de parcelamentos preserva termos originais. Cancelamento exige estorno dos pagamentos das faturas envolvidas e altera plano/parcelas em uma transação. Antecipação move somente parcelas futuras elegíveis para uma fatura aberta anterior, preserva competência e aplica desconto em ordem crescente de parcela. O pagamento do valor líquido ocorre na mesma operação. Faturas com pagamentos prévios e parcelas já antecipadas não são elegíveis.

Recorrências têm geração explícita e limitada, ancorada na data inicial. Alterar uma regra afeta somente ocorrências ainda não geradas. Encerrar uma regra não cancela obrigações já lançadas e não altera liquidações anteriores. Crédito recorrente continua pendente; a interface oferece apenas dinheiro, Pix, débito e transferência.

## Crédito — compras e recorrências

A migration 20261031000500 acrescenta a resolução de faturas e o cadastro idempotente de compras avulsas. Compra no próprio dia do fechamento pertence ao próximo ciclo. Fechamento e vencimento são limitados ao último dia do mês. Se o dia de vencimento for menor ou igual ao fechamento, o vencimento ocorre no mês seguinte ao fechamento; caso contrário, no mesmo mês. Faturas existentes preservam as datas previamente registradas.

Compras avulsas permitem informar explicitamente o mês de vencimento para ajustar divergências do emissor; não aceitam faturas cujo vencimento preceda a compra. Faturas fechadas, canceladas ou com pagamentos confirmados não recebem novos itens. A compra é `expense/credit/posted`, sem conta e sem data de liquidação, e sua criação com a fatura ocorre atomicamente.

Recorrências no crédito exigem tipo despesa e cartão. A geração resolve cada fatura pelo calendário do cartão, sem registrar saída de caixa. Ocorrências existentes, inclusive canceladas, são ignoradas antes de resolver a fatura, impedindo recriação e permitindo repetir a geração após pagamentos. Faturas novas usam as configurações vigentes do cartão; mudanças não reescrevem as já existentes.

## Edição dos cadastros e lançamentos

A migration 20261031000600 centraliza alterações autenticadas em uma operação com campos permitidos e versão otimista. Categoria preserva o tipo; cartões preservam as datas de faturas existentes; conta não aceita data de saldo inicial posterior a liquidações confirmadas. Desativação preserva os vínculos e o histórico. Cancelamento de lançamento limpa a data de liquidação e mantém auditoria. No crédito, mudanças de conta, forma e fatura não são permitidas pelo editor; faturas com pagamentos exigem estorno antes de alterar ou cancelar itens.

O formulário conserva a versão exibida ao abrir a edição. Se outra sessão modificar o registro, a gravação é rejeitada em vez de sobrescrever dados silenciosamente. Nenhum fluxo usa exclusão física.
