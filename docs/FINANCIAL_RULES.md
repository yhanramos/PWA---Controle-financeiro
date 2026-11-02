# Regras financeiras — contrato para implementação

## Etapa 4, fase 4 — projeção (2026-11-02)

Projeção = caixa atual até hoje + receitas pendentes − despesas pendentes fora do crédito − saldo em aberto das faturas, considerando todos os vencimentos até o último dia do mês selecionado, inclusive atrasados e meses intermediários. O saldo das faturas já desconta pagamentos confirmados e descontos de parcelas; pagamentos estornados não liquidam obrigações. Não deduzir novamente parcelas/compras separadamente das faturas. Contas e cartões inativos preservam os compromissos existentes. Saldo negativo é válido.

A referência é hoje em America/Sao_Paulo. Meses anteriores exibem projeção não aplicável, sem estimativa histórica fabricada. Recorrências não geradas, novas compras e saldos iniciais futuros não compõem a estimativa. A tela explicita essas limitações e os atrasados incluídos; valores são condicionais ao recebimento/pagamento dos compromissos registrados. Consultas autenticadas/paginadas e cálculo em BigInt seguem as fases anteriores; não há snapshot transacional entre tabelas.

## Etapa 4, fase 3 — gráficos (2026-11-02)

Evolução financeira: seis meses terminando no mês selecionado, com receitas/despesas fora do crédito liquidadas pela data efetiva e pagamentos de fatura confirmados pela data do pagamento, até hoje em America/Sao_Paulo. Não inclui saldo inicial, previsões, compras no crédito ou pagamentos estornados. Meses futuros não são projeções. Estado atual corrigido dos registros, não reconstrução histórica da auditoria.

Categorias: despesas não canceladas (previstas/liquidadas fora do crédito e compras lançadas no crédito) pelo mês de ocorrência, mais parcelas ativas de planos ativos pelo competence_month original, deduzindo descontos. Excluir itens de faturas canceladas e nunca adicionar pagamentos de fatura. Antecipação preserva competência; parcelas históricas não importadas não são inventadas. Categorias inativas mantêm o histórico. Os valores de competência podem diferir do caixa e do total por vencimento. Totais em centavos/BigInt e validação de faixa segura precedem a apresentação. Leituras paginadas com RLS; sem snapshot transacional entre tabelas.

## Etapa 4, fase 2 — indicadores mensais (2026-11-02)

Indicadores filtrados pelo mês de vencimento, usando o estado atual dos registros (inclusive ao consultar meses passados). Receitas previstas somam apenas receitas pendentes fora do crédito; despesas pendentes somam apenas despesas pendentes fora do crédito. Atrasados aparecem no mês original de vencimento. Regras recorrentes ainda não geradas não entram nos totais.

Total das faturas soma compras lançadas e parcelas ativas de planos ativos nas faturas não canceladas que vencem no mês, menos descontos. Inclui faturas já pagas; o valor em aberto é mostrado separadamente, deduzindo pagamentos confirmados (estornados não deduzem). Parcelas antecipadas seguem a fatura de destino. Não somar faturas às despesas fora do crédito neste card. Cadastros inativos preservam seus compromissos. Zero sem registros é distinto de falha de consulta. Leituras paginadas por usuário, BigInt e limites seguros seguem a fase 1; não constituem snapshot transacional nem reconstrução histórica por auditoria.

## Etapa 4, fase 1 — saldo atual (2026-11-02)

O saldo atual acumula saldos iniciais com data até hoje, mais receitas liquidadas, menos despesas liquidadas fora do crédito e pagamentos de fatura confirmados, usando as datas efetivas até hoje em America/Sao_Paulo. Cancelados, previstos, compras/parcelas no crédito e pagamentos estornados não movimentam esse total. Contas inativas continuam incluídas: desativar um cadastro não apaga dinheiro nem histórico. Saldo negativo é permitido.

Esta fase exibe a posição atual corrigida e identificada pela data, independente do seletor mensal. Não reconstrói o que era conhecido antes de um estorno/cancelamento passado; o filtro histórico exige política temporal e auditoria na fase 6. Todas as contas (inclusive sem movimento e inativas) contribuem a partir da data do saldo inicial. Sem contas elegíveis, exibir zero com convite de cadastro; falha de leitura/validação exibe indisponibilidade, nunca zero fictício.

Leituras autenticadas e paginadas usam RLS e filtro de proprietário; valores são validados como centavos inteiros seguros, somados com BigInt e verificados antes da apresentação. O cartão inclui composição acumulada e nova consulta após mutações, retorno à tela/foco e a cada minuto enquanto visível. As três leituras não representam um snapshot transacional; concorrência externa pode produzir uma visão transitória até a atualização seguinte. Casos de domínio foram escritos em `cash-balance.test.ts`, sem execução conforme restrição vigente.

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
