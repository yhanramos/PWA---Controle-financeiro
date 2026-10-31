-- Inspeção somente de metadados. Não cria usuários, não altera dados e não testa RLS.
begin read only;

with table_configuration as (
select c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  coalesce((select jsonb_agg(jsonb_build_object(
    'name', p.policyname, 'command', p.cmd, 'roles', p.roles,
    'using', p.qual, 'with_check', p.with_check
  ) order by p.policyname) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname), '[]'::jsonb) as policies,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
  has_table_privilege('anon', c.oid, 'INSERT') as anon_insert,
  has_table_privilege('anon', c.oid, 'UPDATE') as anon_update,
  has_table_privilege('anon', c.oid, 'DELETE') as anon_delete,
  has_table_privilege('authenticated', c.oid, 'DELETE') as authenticated_delete,
  has_table_privilege('authenticated', c.oid, 'TRUNCATE') as authenticated_truncate,
  (select count(*) from pg_constraint fk where fk.conrelid = c.oid and fk.contype = 'f') as foreign_key_count
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname
), application_triggers as (

select event_object_schema, event_object_table, trigger_name, event_manipulation, action_statement
from information_schema.triggers
where (event_object_schema = 'auth' and trigger_name = 'clareza_on_auth_user_created')
  or event_object_schema = 'public'
order by event_object_table, trigger_name, event_manipulation
), profile_privileges as (

select table_name, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated'
order by privilege_type, column_name
)
select jsonb_build_object(
  'tables', (select jsonb_agg(to_jsonb(t)) from table_configuration t),
  'triggers', (select jsonb_agg(to_jsonb(t)) from application_triggers t),
  'profile_privileges', (select jsonb_agg(to_jsonb(p)) from profile_privileges p)
) as configuration;

rollback;
