-- Regressão MANUAL FUTURA. NÃO executada nesta entrega.
-- Somente em projeto Supabase descartável com a migration inicial aplicada.
-- Não faz parte do script de instalação. Não executar enquanto testes forem proibidos.
-- Rodar como postgres; tudo é revertido no final. Nenhum dado de produção é necessário.
begin;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'schema-a@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'schema-b@example.invalid');

insert into public.accounts (id, user_id, name) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Conta A'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Conta B');
insert into public.credit_cards (id, user_id, name, institution, closing_day, due_day) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Cartão A', 'Instituição A', 25, 5),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Cartão B', 'Instituição B', 25, 5);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  expense_category uuid;
  income_category uuid;
  invoice uuid;
  plan_id uuid;
  request_key uuid := gen_random_uuid();
  affected integer;
begin
  if (select count(*) from public.profiles) <> 1 then
    raise exception 'FAIL: isolamento de profiles';
  end if;
  if (select count(*) from public.categories) <> 14 then
    raise exception 'FAIL: categorias padrão ou isolamento';
  end if;
  if (select count(*) from public.accounts) <> 1 then
    raise exception 'FAIL: leitura de contas de outro usuário';
  end if;
  update public.profiles set display_name = 'Nome A' where id = auth.uid();
  update public.accounts set name = 'Não permitido' where id = '20000000-0000-4000-8000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: update de outro usuário'; end if;

  begin
    insert into public.accounts (user_id, name)
      values ('10000000-0000-4000-8000-000000000002', 'Invasão');
    raise exception 'FAIL: insert com outro proprietário';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.accounts where id = '20000000-0000-4000-8000-000000000001';
    raise exception 'FAIL: cliente pode excluir histórico';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.credit_card_invoices (credit_card_id, reference_month, closing_date, due_date)
      values ('30000000-0000-4000-8000-000000000002', '2026-11-01', '2026-10-25', '2026-11-05');
    raise exception 'FAIL: referência a cartão de outro usuário';
  exception when foreign_key_violation then null;
  end;

  select id into strict expense_category from public.categories where name = 'Compras' and kind = 'expense';
  select id into strict income_category from public.categories where name = 'Salário' and kind = 'income';
  insert into public.transactions (idempotency_key, description, kind, amount_cents, category_id, occurred_on, due_date, payment_method)
    values (request_key, 'Receita prevista', 'income', 10000, income_category, '2026-10-29', '2026-11-05', 'pix');
  if exists (select 1 from public.transactions where idempotency_key = request_key and (status <> 'pending' or settled_on is not null)) then
    raise exception 'FAIL: receita prevista tratada como recebida';
  end if;
  begin
    insert into public.transactions (idempotency_key, description, kind, amount_cents, category_id, occurred_on, due_date, payment_method)
      values (request_key, 'Repetição', 'income', 10000, income_category, '2026-10-29', '2026-11-05', 'pix');
    raise exception 'FAIL: idempotência';
  exception when unique_violation then null;
  end;
  begin
    update public.transactions set status = 'settled' where idempotency_key = request_key;
    raise exception 'FAIL: liquidação sem data e conta';
  exception when check_violation then null;
  end;
  begin
    update public.transactions set idempotency_key = gen_random_uuid() where idempotency_key = request_key;
    raise exception 'FAIL: chave de idempotência alterável';
  exception when check_violation then null;
  end;
  begin
    insert into public.transactions (description, kind, amount_cents, category_id, occurred_on, due_date, payment_method)
      values ('Categoria incorreta', 'expense', 100, income_category, '2026-10-29', '2026-11-05', 'pix');
    raise exception 'FAIL: categoria de receita em despesa';
  exception when foreign_key_violation then null;
  end;

  insert into public.credit_card_invoices (credit_card_id, reference_month, closing_date, due_date)
    values ('30000000-0000-4000-8000-000000000001', '2026-11-01', '2026-10-25', '2026-11-05') returning id into invoice;
  insert into public.installment_plans (description, credit_card_id, category_id, total_amount_cents,
    installment_count, paid_before_tracking, purchased_on, first_unpaid_invoice_month)
    values ('Compra histórica', '30000000-0000-4000-8000-000000000001', expense_category,
      1000, 3, 1, '2026-09-01', '2026-11-01') returning id into plan_id;
  insert into public.installments (installment_plan_id, credit_card_id, invoice_id, installment_number, amount_cents, competence_month)
    values (plan_id, '30000000-0000-4000-8000-000000000001', invoice, 2, 333, '2026-11-01');
  begin
    insert into public.installments (installment_plan_id, credit_card_id, invoice_id, installment_number, amount_cents, competence_month)
      values (plan_id, '30000000-0000-4000-8000-000000000001', invoice, 1, 334, '2026-10-01');
    raise exception 'FAIL: parcela histórica paga regenerada';
  exception when check_violation then null;
  end;
  begin
    insert into public.installments (installment_plan_id, credit_card_id, invoice_id, installment_number, amount_cents, competence_month)
      values (plan_id, '30000000-0000-4000-8000-000000000001', invoice, 3, 334, '2026-12-01');
    raise exception 'FAIL: distribuição incorreta de centavos';
  exception when check_violation then null;
  end;
  begin
    update public.installments set anticipated_on = '2026-10-29', discount_cents = 10 where installment_plan_id = plan_id;
    raise exception 'FAIL: antecipação sem autorização do cartão';
  exception when check_violation then null;
  end;
  begin
    update public.installment_plans set total_amount_cents = 2000 where id = plan_id;
    raise exception 'FAIL: termos originais alterados';
  exception when check_violation then null;
  end;
  insert into public.invoice_payments (invoice_id, account_id, amount_cents, paid_on)
    values (invoice, '20000000-0000-4000-8000-000000000001', 333, '2026-11-05');
  if exists (select 1 from public.transactions where kind = 'expense') then
    raise exception 'FAIL: pagamento gerou uma despesa duplicada';
  end if;

  if not exists (select 1 from public.financial_audit_log where table_name = 'invoice_payments') then
    raise exception 'FAIL: histórico ausente';
  end if;
  if exists (select 1 from public.financial_audit_log where user_id <> auth.uid()) then
    raise exception 'FAIL: histórico de outro usuário exposto';
  end if;
  begin
    insert into public.financial_audit_log (user_id, table_name, record_id, action, new_data)
      values (auth.uid(), 'accounts', gen_random_uuid(), 'INSERT', '{}');
    raise exception 'FAIL: cliente pode forjar auditoria';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.chat_messages (conversation_id, request_id, role, content)
      values (gen_random_uuid(), gen_random_uuid(), 'assistant', 'Resposta forjada');
    raise exception 'FAIL: cliente pode forjar mensagem do assistente';
  exception when insufficient_privilege then null;
  end;
  raise notice 'Cenários de usuário A concluídos.';
end;
$$;

reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.accounts;
    raise exception 'FAIL: leitura anônima';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
