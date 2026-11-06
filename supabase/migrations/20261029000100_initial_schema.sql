-- Clareza: instalação inicial no Supabase SQL Editor (role postgres).
-- Executar o arquivo inteiro UMA VEZ, em um projeto sem estas tabelas.
-- Não remove objetos existentes. Qualquer erro desfaz toda esta transação.
-- Não implementa geração de parcelas/recorrências nem RPCs de liquidação.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Limite por valor abaixo de Number.MAX_SAFE_INTEGER. Agregações também
-- precisam de validação de faixa antes da conversão para number no frontend.
create domain public.money_cents as bigint
  check (value between -9007199254740991 and 9007199254740991);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  currency text not null default 'BRL' check (currency = 'BRL'),
  timezone text not null default 'America/Sao_Paulo' check (timezone = 'America/Sao_Paulo'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  institution text check (char_length(institution) <= 100),
  kind text not null default 'checking' check (kind in ('checking', 'savings', 'cash', 'other')),
  opening_balance_cents public.money_cents not null default 0,
  opening_balance_date date not null default (now() at time zone 'America/Sao_Paulo')::date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind text not null check (kind in ('income', 'expense')),
  color text not null default '#8073f5' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, id, kind)
);
create unique index categories_user_name_kind_key
  on public.categories (user_id, lower(btrim(name)), kind);

create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  institution text not null check (char_length(btrim(institution)) between 1 and 100),
  color text not null default '#8073f5' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  closing_day smallint not null check (closing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  credit_limit_cents public.money_cents check (credit_limit_cents >= 0),
  -- null significa desconhecido; não presumir que antecipação seja permitida.
  allows_early_settlement boolean,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.credit_card_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  credit_card_id uuid not null,
  -- Sempre o primeiro dia do mês de VENCIMENTO, não o mês da compra.
  reference_month date not null check (extract(day from reference_month) = 1),
  closing_date date not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, id, credit_card_id),
  unique (user_id, credit_card_id, reference_month),
  foreign key (user_id, credit_card_id) references public.credit_cards(user_id, id),
  check (closing_date <= due_date),
  check (date_trunc('month', due_date::timestamp)::date = reference_month)
  -- Total, saldo e condição de pagamento serão derivados de itens/pagamentos.
);

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  idempotency_key uuid not null default gen_random_uuid(),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  kind text not null check (kind in ('income', 'expense')),
  amount_cents public.money_cents not null check (amount_cents > 0),
  category_id uuid not null,
  account_id uuid,
  credit_card_id uuid,
  payment_method text not null check (payment_method in ('cash', 'pix', 'debit', 'bank_transfer', 'credit')),
  -- Semanal = week/1; mensal = month/1; bimestral = month/2; anual = year/1.
  interval_unit text not null check (interval_unit in ('day', 'week', 'month', 'year')),
  interval_count integer not null default 1 check (interval_count between 1 and 365),
  starts_on date not null,
  ends_on date,
  is_active boolean not null default true,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, id, kind),
  unique (user_id, idempotency_key),
  foreign key (user_id, category_id, kind) references public.categories(user_id, id, kind),
  foreign key (user_id, account_id) references public.accounts(user_id, id),
  foreign key (user_id, credit_card_id) references public.credit_cards(user_id, id),
  check (ends_on is null or ends_on >= starts_on),
  check (
    (payment_method = 'credit' and kind = 'expense' and credit_card_id is not null and account_id is null)
    or (payment_method <> 'credit' and credit_card_id is null)
  )
);

-- Apenas receitas e despesas avulsas/recorrentes. Uma compra parcelada
-- NÃO deve criar uma linha aqui: seu custo está nas parcelas individuais.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  idempotency_key uuid not null default gen_random_uuid(),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  kind text not null check (kind in ('income', 'expense')),
  amount_cents public.money_cents not null check (amount_cents > 0),
  category_id uuid not null,
  occurred_on date not null,
  due_date date not null,
  settled_on date,
  payment_method text not null check (payment_method in ('cash', 'pix', 'debit', 'bank_transfer', 'credit')),
  account_id uuid,
  credit_card_id uuid,
  invoice_id uuid,
  status text not null default 'pending' check (status in ('pending', 'settled', 'posted', 'cancelled')),
  recurring_transaction_id uuid,
  -- Identidade da ocorrência original; não muda ao reagendar o vencimento.
  recurrence_on date,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, idempotency_key),
  unique (user_id, recurring_transaction_id, recurrence_on),
  foreign key (user_id, category_id, kind) references public.categories(user_id, id, kind),
  foreign key (user_id, account_id) references public.accounts(user_id, id),
  foreign key (user_id, credit_card_id) references public.credit_cards(user_id, id),
  foreign key (user_id, invoice_id, credit_card_id) references public.credit_card_invoices(user_id, id, credit_card_id),
  foreign key (user_id, recurring_transaction_id, kind) references public.recurring_transactions(user_id, id, kind),
  check ((recurring_transaction_id is null) = (recurrence_on is null)),
  check (
    (payment_method = 'credit' and kind = 'expense' and credit_card_id is not null
      and invoice_id is not null and account_id is null and settled_on is null
      and status in ('posted', 'cancelled'))
    or
    (payment_method <> 'credit' and credit_card_id is null and invoice_id is null
      and status in ('pending', 'settled', 'cancelled')
      and ((status = 'settled' and settled_on is not null and account_id is not null)
        or (status <> 'settled' and settled_on is null)))
  )
);

create table public.installment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  idempotency_key uuid not null default gen_random_uuid(),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  credit_card_id uuid not null,
  category_id uuid not null,
  category_kind text not null default 'expense' check (category_kind = 'expense'),
  total_amount_cents public.money_cents not null check (total_amount_cents > 0),
  installment_count smallint not null check (installment_count between 1 and 600),
  -- Quantidade histórica informada. Não cria saídas de caixa retroativas.
  paid_before_tracking smallint not null default 0,
  purchased_on date not null,
  -- Mês de vencimento da primeira parcela AINDA RESTANTE, para importação.
  first_unpaid_invoice_month date not null check (extract(day from first_unpaid_invoice_month) = 1),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, id, credit_card_id),
  unique (user_id, idempotency_key),
  foreign key (user_id, credit_card_id) references public.credit_cards(user_id, id),
  foreign key (user_id, category_id, category_kind) references public.categories(user_id, id, kind),
  check (paid_before_tracking >= 0 and paid_before_tracking < installment_count),
  check (total_amount_cents >= installment_count)
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  installment_plan_id uuid not null,
  credit_card_id uuid not null,
  invoice_id uuid not null,
  installment_number smallint not null check (installment_number between 1 and 600),
  amount_cents public.money_cents not null check (amount_cents > 0),
  discount_cents public.money_cents not null default 0 check (discount_cents >= 0 and discount_cents <= amount_cents),
  -- Competência original preservada mesmo se a parcela mudar de fatura.
  competence_month date not null check (extract(day from competence_month) = 1),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  anticipated_on date,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, installment_plan_id, installment_number),
  foreign key (user_id, installment_plan_id, credit_card_id) references public.installment_plans(user_id, id, credit_card_id),
  foreign key (user_id, invoice_id, credit_card_id) references public.credit_card_invoices(user_id, id, credit_card_id),
  check (discount_cents = 0 or anticipated_on is not null)
);

-- Pagamento de fatura é saída de caixa, nunca uma nova despesa de competência.
-- Vários pagamentos parciais são possíveis; não há total duplicado na fatura.
create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  idempotency_key uuid not null default gen_random_uuid(),
  invoice_id uuid not null,
  account_id uuid not null,
  amount_cents public.money_cents not null check (amount_cents > 0),
  paid_on date not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'reversed')),
  reversed_at timestamptz,
  reversal_reason text check (char_length(btrim(reversal_reason)) between 1 and 500),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, idempotency_key),
  foreign key (user_id, invoice_id) references public.credit_card_invoices(user_id, id),
  foreign key (user_id, account_id) references public.accounts(user_id, id),
  check (
    (status = 'confirmed' and reversed_at is null and reversal_reason is null)
    or (status = 'reversed' and reversed_at is not null and reversal_reason is not null)
  )
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  conversation_id uuid not null,
  request_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(btrim(content)) between 1 and 16000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_id, role)
);

-- Trilha escrita somente por trigger; não contém chat nem credenciais.
create table public.financial_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE')),
  old_data jsonb,
  new_data jsonb not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create index accounts_user_active_idx on public.accounts(user_id, is_active);
create index cards_user_active_idx on public.credit_cards(user_id, is_active);
create index invoices_user_due_idx on public.credit_card_invoices(user_id, due_date);
create index transactions_user_due_idx on public.transactions(user_id, due_date, status);
create index transactions_user_occurred_idx on public.transactions(user_id, occurred_on);
create index transactions_user_category_idx on public.transactions(user_id, category_id, kind);
create index transactions_user_account_idx on public.transactions(user_id, account_id);
create index transactions_user_invoice_idx on public.transactions(user_id, invoice_id, credit_card_id);
create index recurring_user_active_idx on public.recurring_transactions(user_id, is_active, starts_on);
create index recurring_user_category_idx on public.recurring_transactions(user_id, category_id, kind);
create index recurring_user_account_idx on public.recurring_transactions(user_id, account_id);
create index recurring_user_card_idx on public.recurring_transactions(user_id, credit_card_id);
create index plans_user_card_idx on public.installment_plans(user_id, credit_card_id);
create index plans_user_category_idx on public.installment_plans(user_id, category_id, category_kind);
create index installments_user_invoice_idx on public.installments(user_id, invoice_id, credit_card_id);
create index installments_user_competence_idx on public.installments(user_id, competence_month);
create index payments_user_invoice_idx on public.invoice_payments(user_id, invoice_id);
create index payments_user_account_date_idx on public.invoice_payments(user_id, account_id, paid_on);
create index chat_user_conversation_idx on public.chat_messages(user_id, conversation_id, created_at);
create index audit_user_record_idx on public.financial_audit_log(user_id, table_name, record_id, created_at);

create function private.set_record_timestamps()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    if new.id is distinct from old.id then
      raise exception 'O identificador não pode ser alterado.' using errcode = '23514';
    end if;
    if tg_table_name <> 'profiles' then
      if new.user_id is distinct from old.user_id then
        raise exception 'O proprietário não pode ser alterado.' using errcode = '23514';
      end if;
    end if;
    if tg_table_name in ('transactions', 'recurring_transactions', 'installment_plans', 'invoice_payments') then
      if new.idempotency_key is distinct from old.idempotency_key then
        raise exception 'A chave de idempotência não pode ser alterada.' using errcode = '23514';
      end if;
    end if;
    if tg_table_name = 'transactions' then
      if row(new.recurring_transaction_id, new.recurrence_on)
        is distinct from row(old.recurring_transaction_id, old.recurrence_on) then
        raise exception 'A identidade da ocorrência não pode ser alterada.' using errcode = '23514';
      end if;
    end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create function private.audit_financial_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.financial_audit_log (user_id, table_name, record_id, action, old_data, new_data, actor_id)
  values (new.user_id, tg_table_name, new.id, tg_op,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new), auth.uid());
  return new;
end;
$$;

-- Congelar termos evita que uma edição do plano invalide parcelas existentes.
-- Correções/estornos serão orquestrados por RPCs futuras com trilha de auditoria.
create function private.protect_plan_terms()
returns trigger language plpgsql set search_path = '' as $$
begin
  if row(new.credit_card_id, new.total_amount_cents, new.installment_count,
      new.paid_before_tracking, new.purchased_on, new.first_unpaid_invoice_month)
    is distinct from row(old.credit_card_id, old.total_amount_cents, old.installment_count,
      old.paid_before_tracking, old.purchased_on, old.first_unpaid_invoice_month) then
    raise exception 'Os termos originais do parcelamento são imutáveis.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger protect_plan_terms before update on public.installment_plans
  for each row execute function private.protect_plan_terms();

create function private.validate_installment()
returns trigger language plpgsql set search_path = '' as $$
declare
  plan public.installment_plans%rowtype;
  expected_amount bigint;
begin
  if tg_op = 'UPDATE' then
    if row(new.installment_plan_id, new.credit_card_id, new.installment_number, new.amount_cents, new.competence_month)
      is distinct from row(old.installment_plan_id, old.credit_card_id, old.installment_number, old.amount_cents, old.competence_month) then
      raise exception 'A identidade e o valor original da parcela são imutáveis.' using errcode = '23514';
    end if;
  end if;
  select * into plan from public.installment_plans
    where user_id = new.user_id and id = new.installment_plan_id;
  if not found then
    raise exception 'Parcelamento inexistente ou não autorizado.' using errcode = '23503';
  end if;
  if new.installment_number <= plan.paid_before_tracking or new.installment_number > plan.installment_count then
    raise exception 'Número de parcela fora do período ainda devido.' using errcode = '23514';
  end if;
  expected_amount := plan.total_amount_cents / plan.installment_count
    + case when new.installment_number <= plan.total_amount_cents % plan.installment_count then 1 else 0 end;
  if new.amount_cents <> expected_amount then
    raise exception 'Valor de parcela incompatível com a distribuição de centavos.' using errcode = '23514';
  end if;
  if new.anticipated_on is not null and not exists (
    select 1 from public.credit_cards where user_id = new.user_id
      and id = new.credit_card_id and allows_early_settlement is true
  ) then
    raise exception 'O cartão não possui antecipação habilitada.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_installment before insert or update on public.installments
  for each row execute function private.validate_installment();

-- RLS não substitui os grants: nenhum acesso anônimo ou DELETE pelo cliente.
-- Cancelar/estornar preserva histórico. Exclusão de conta é fluxo administrativo.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'accounts', 'categories', 'credit_cards', 'credit_card_invoices',
    'recurring_transactions', 'transactions', 'installment_plans', 'installments', 'invoice_payments'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update on table public.%I to authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
    execute format('create policy own_select on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name);
    execute format('create policy own_insert on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name);
    execute format('create policy own_update on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name);
    execute format('create trigger set_record_timestamps before insert or update on public.%I for each row execute function private.set_record_timestamps()', table_name);
    execute format('create trigger audit_financial_change after insert or update on public.%I for each row execute function private.audit_financial_change()', table_name);
  end loop;
end;
$$;

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy own_select on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy own_update on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create trigger set_record_timestamps before insert or update on public.profiles
  for each row execute function private.set_record_timestamps();

alter table public.chat_messages enable row level security;
revoke all on table public.chat_messages from public, anon, authenticated;
grant select, insert on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
create policy own_select on public.chat_messages for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.chat_messages for insert to authenticated
  with check ((select auth.uid()) = user_id and role = 'user');
create trigger set_record_timestamps before insert or update on public.chat_messages
  for each row execute function private.set_record_timestamps();

alter table public.financial_audit_log enable row level security;
revoke all on table public.financial_audit_log from public, anon, authenticated, service_role;
grant select on public.financial_audit_log to authenticated;
grant select on public.financial_audit_log to service_role;
create policy own_select on public.financial_audit_log for select to authenticated
  using ((select auth.uid()) = user_id);

-- Executada somente pelo trigger Auth e pelo backfill abaixo.
create function private.initialize_financial_user(target_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (target_user_id) on conflict (id) do nothing;
  insert into public.categories (user_id, name, kind)
  select target_user_id, seed.name, seed.kind from (values
    ('Alimentação', 'expense'), ('Transporte', 'expense'), ('Moradia', 'expense'),
    ('Saúde', 'expense'), ('Educação', 'expense'), ('Lazer', 'expense'),
    ('Compras', 'expense'), ('Assinaturas', 'expense'), ('Impostos', 'expense'),
    ('Outros', 'expense'), ('Salário', 'income'), ('Freelance', 'income'),
    ('Renda extra', 'income'), ('Outros', 'income')
  ) as seed(name, kind)
  on conflict do nothing;
end;
$$;

create function private.handle_new_financial_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.initialize_financial_user(new.id);
  return new;
end;
$$;
create trigger clareza_on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_financial_user();

-- Fechar execução direta (incluindo default EXECUTE de PUBLIC).
revoke all on function private.set_record_timestamps() from public, anon, authenticated, service_role;
revoke all on function private.audit_financial_change() from public, anon, authenticated, service_role;
revoke all on function private.protect_plan_terms() from public, anon, authenticated, service_role;
revoke all on function private.validate_installment() from public, anon, authenticated, service_role;
revoke all on function private.initialize_financial_user(uuid) from public, anon, authenticated, service_role;
revoke all on function private.handle_new_financial_user() from public, anon, authenticated, service_role;

do $$
declare existing_user record;
begin
  for existing_user in select id from auth.users loop
    perform private.initialize_financial_user(existing_user.id);
  end loop;
end;
$$;

comment on table public.transactions is 'Receitas e despesas avulsas/recorrentes. Não duplicar compras parceladas nem pagamentos de fatura.';
comment on table public.installment_plans is 'Metadados da compra parcelada; não somar o total do plano como despesa adicional às parcelas.';
comment on table public.installments is 'Obrigações de crédito. Caixa é movimentado em invoice_payments, nunca diretamente aqui.';
comment on table public.invoice_payments is 'Liquidações de caixa. Não incluir novamente nos totais de despesas por competência.';
comment on table public.financial_audit_log is 'Histórico financeiro privado. Somente triggers escrevem; remoção de usuário elimina seu histórico.';

commit;
