# Migrations

Migration inicial: `20261029000100_initial_schema.sql`.

Para uma instalação nova, abra **SQL Editor → New query**, cole o arquivo inteiro e execute como `postgres`. Execute uma única vez, em um projeto sem estas tabelas da aplicação. O script usa uma transação e não remove tabelas existentes. Não adicione credenciais ao arquivo.

Leia [DATABASE.md](../../docs/DATABASE.md) para o modelo, RLS, instalação e regras ainda pendentes. O usuário confirmou a aplicação no Supabase em 30/10/2026. Os metadados remotos foram inspecionados e os tipos oficiais foram gerados; testes comportamentais não foram executados. Não reaplique esta migration após o sucesso; evoluções devem ser novas migrations versionadas.

O arquivo em `../tests/` é somente uma suíte futura de regressão e não faz parte da instalação. Não executá-lo enquanto testes estiverem proibidos pelo projeto. A consulta em `../inspection/` lê somente metadados, sem modificar dados da aplicação.
