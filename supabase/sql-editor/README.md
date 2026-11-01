# Aplicação da Etapa 3 no Supabase

Arquivo único: [ETAPA_3_COMPLETA.sql](ETAPA_3_COMPLETA.sql).

Pré-condição: a instalação inicial `20261029000100_initial_schema.sql` já foi aplicada, e nenhuma migration da Etapa 3 foi executada. Este é o estado informado nesta conversa.

1. Abra o projeto correto no Supabase e entre em **SQL Editor → New query**.
2. Use a role **postgres**. Cole TODO o conteúdo de `ETAPA_3_COMPLETA.sql`.
3. Execute uma vez. Aguarde a mensagem **Etapa 3 aplicada com sucesso**.
4. Recarregue o aplicativo. Podemos então validar os cadastros, edições, cancelamentos, crédito, parcelamentos, recorrências, pagamentos e estornos.

O arquivo reúne as seis migrations da Etapa 3 na ordem de dependência, com uma única transação. Não execute também os arquivos individuais. Não repita a instalação inicial. Não há limpeza de registros, credenciais nem dados fictícios. Em caso de erro, o conjunto é desfeito; envie a mensagem completa antes de tentar executar trechos isolados.

A revisão estática encontrou e corrigiu um delimitador de função inválido na migration 006 e uma possibilidade de reutilizar chave de pagamento em antecipação. A montagem conferiu os seis arquivos, seus delimitadores e a transação externa única. Isso não substitui a execução e a validação comportamental no PostgreSQL, ainda pendentes.

Este arquivo é um pacote para o SQL Editor, não uma migration adicional para o CLI. A execução manual não registra automaticamente versões em `supabase_migrations.schema_migrations`. Antes de usar `supabase db push` no futuro, conciliar o histórico. Regenerar os tipos oficiais após a aplicação.
