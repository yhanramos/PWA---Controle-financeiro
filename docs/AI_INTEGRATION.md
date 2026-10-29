# Integração com IA — planejada para a Etapa 5

Nenhuma chamada ao Gemini é feita nesta versão. A tela atual informa que o recurso está em preparação; não existe chat simulado.

## Fluxo previsto

Frontend autenticado → Edge Function financial-assistant → verificação do JWT → limite de uso → Gemini Function Calling/Structured Outputs → validação de schema e autorização → ferramenta financeira explícita → persistência/consulta real → resposta.

O modelo nunca recebe acesso direto ao banco, SQL arbitrário ou chave privilegiada. Ferramentas propostas: consultar resumo, consultar compromissos por cartão, criar receita, criar despesa e criar parcelamento. Seus schemas deverão limitar campos, valores, datas, tamanhos e enumerações. IDs devem ser resolvidos e validados no backend contra o usuário autenticado. Ambiguidades relevantes exigem esclarecimento.

Tratar mensagens e respostas do modelo como dados não confiáveis. Não aceitar user_id fornecido pelo modelo como autorização. Preferir cliente Supabase sob JWT do usuário, mantendo RLS. Idempotência deve ser transacional, persistida e vinculada ao usuário e à requisição. Limites de uso devem ser verificados antes de chamar Gemini; definir orçamento, timeout e limite de ferramentas por turno.

Exclusões e operações sensíveis precisam de confirmação vinculada à operação exata e com validade limitada. Declarar sucesso somente após confirmação de persistência. Não inventar saldos, transações ou categorias. Ferramentas de consulta só retornam dados autorizados e necessários.

## Secrets

`GEMINI_API_KEY` será cadastrada em Supabase Secrets, nunca em variável VITE_. Modelo e limites serão definidos na implementação após verificar documentação atual do provedor. Não registrar chaves ou dados financeiros completos em logs. Definir retenção do histórico e política de tratamento de dados antes de liberar o assistente.
