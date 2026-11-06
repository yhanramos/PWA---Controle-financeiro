-- CLAREZA — ETAPA 3 — ATUALIZAÇÃO DO BANCO EXISTENTE
-- Requer 20261029000100_initial_schema.sql já aplicado.
-- Executar TODO este arquivo UMA VEZ no Supabase SQL Editor, role postgres.
-- Este arquivo substitui a execução individual das seis migrations da Etapa 3.
-- Não reaplica a instalação inicial, não remove registros e não contém credenciais.
-- Revisão estática realizada; execução e testes no banco ainda pendentes.
-- Qualquer erro desfaz toda esta execução.
begin;
set local lock_timeout = '10s';
select pg_advisory_xact_lock(20261031, 3);
do $preflight$
declare table_name text;
begin
 foreach table_name in array array['profiles','accounts','categories','credit_cards','credit_card_invoices','transactions','installment_plans','installments','invoice_payments','recurring_transactions','financial_audit_log'] loop
  if to_regclass('public.' || table_name) is null then
   raise exception 'Instalação inicial incompleta: falta public.%. Este pacote não instala um banco vazio.', table_name;
  end if;
 end loop;
 if to_regnamespace('private') is null then raise exception 'Schema private ausente.'; end if;
 if to_regclass('private.financial_requests') is not null then
  raise exception 'Objetos da Etapa 3 já existem. Não repita a instalação: confira o que já foi aplicado.';
 end if;
end;
$preflight$;

-- 20261031000100_financial_operations.sql
-- Rascunho anterior nunca aplicado: criação atômica de plano e faturas.
create table private.financial_requests (
 user_id uuid not null references public.profiles(id) on delete cascade,
 request_id uuid not null,
 operation text not null,
 payload jsonb not null,
 result_id uuid not null,
 primary key(user_id,request_id)
);
revoke all on private.financial_requests from public,anon,authenticated;

create function public.create_installment_plan(p_key uuid,p_input jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); prior private.financial_requests%rowtype; plan_id uuid; v_invoice_id uuid;
 card_id uuid:=(p_input->>'card_id')::uuid; category uuid:=(p_input->>'category_id')::uuid;
 total bigint:=(p_input->>'total')::bigint; count_parts integer:=(p_input->>'count')::integer;
 historical integer:=(p_input->>'historical')::integer; purchased date:=(p_input->>'purchased_on')::date;
 first_due date:=(p_input->>'first_due')::date; first_close date:=(p_input->>'first_close')::date;
 due_on date; close_on date; month_ref date; n integer; offset_months integer; invoice_status text;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_key is null or p_input is null or card_id is null or category is null or total is null or count_parts is null or historical is null or purchased is null or first_due is null or first_close is null
 or count_parts not between 1 and 600 or historical<0 or historical>=count_parts or total<count_parts or total>9007199254740991 or first_close>first_due or purchased>first_close or char_length(btrim(coalesce(p_input->>'description',''))) not between 1 and 200
 then raise exception 'Dados do parcelamento inválidos.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into prior from private.financial_requests where user_id=u and request_id=p_key;
 if found then
  if prior.operation<>'installment' or prior.payload<>p_input then raise exception 'Tentativa com dados diferentes.' using errcode='23505'; end if;
  return prior.result_id;
 end if;
 perform 1 from public.credit_cards where id=card_id and user_id=u and is_active for share;
 if not found then raise exception 'Cartão indisponível.' using errcode='23514'; end if;
 perform 1 from public.categories where id=category and user_id=u and is_active and kind='expense' for share;
 if not found then raise exception 'Categoria indisponível.' using errcode='23514'; end if;
 insert into public.installment_plans(user_id,idempotency_key,description,credit_card_id,category_id,total_amount_cents,installment_count,paid_before_tracking,purchased_on,first_unpaid_invoice_month)
 values(u,p_key,btrim(p_input->>'description'),card_id,category,total,count_parts,historical,purchased,date_trunc('month',first_due)::date) returning id into plan_id;
 for n in historical+1..count_parts loop
  offset_months:=n-historical-1;
  -- Sempre ancorado nas datas iniciais: fevereiro não desloca março.
  due_on:=(first_due+make_interval(months=>offset_months))::date;
  close_on:=(first_close+make_interval(months=>offset_months))::date;
  month_ref:=date_trunc('month',due_on)::date;
  insert into public.credit_card_invoices(user_id,credit_card_id,reference_month,closing_date,due_date)
  values(u,card_id,month_ref,close_on,due_on) on conflict(user_id,credit_card_id,reference_month) do nothing;
  select id,status into v_invoice_id,invoice_status from public.credit_card_invoices where user_id=u and credit_card_id=card_id and reference_month=month_ref for update;
  if invoice_status<>'open' or exists(select 1 from public.credit_card_invoices where id=v_invoice_id and (closing_date<>close_on or due_date<>due_on)) or exists(select 1 from public.invoice_payments where user_id=u and invoice_id=v_invoice_id and status='confirmed') then
   raise exception 'Fatura existente incompatível: confira datas e pagamentos.' using errcode='23514';
  end if;
  insert into public.installments(user_id,installment_plan_id,credit_card_id,invoice_id,installment_number,amount_cents,competence_month)
  values(u,plan_id,card_id,v_invoice_id,n,total/count_parts+case when n<=total%count_parts then 1 else 0 end,month_ref);
 end loop;
 insert into private.financial_requests values(u,p_key,'installment',p_input,plan_id);
 return plan_id;
end; $$;
revoke insert,update on public.installment_plans,public.installments from authenticated;
revoke all on function public.create_installment_plan(uuid,jsonb) from public,anon;
grant execute on function public.create_installment_plan(uuid,jsonb) to authenticated;


-- 20261031000200_invoice_payments.sql
-- Faturas: pagamentos serializados, sem duplicar despesas.
create function private.invoice_outstanding(p_user uuid,p_invoice uuid) returns numeric
language sql stable set search_path='' as $$
 select coalesce((select sum(amount_cents) from public.transactions where user_id=p_user and invoice_id=p_invoice and status='posted'),0)
 + coalesce((select sum(i.amount_cents-i.discount_cents) from public.installments i join public.installment_plans p on p.id=i.installment_plan_id and p.user_id=i.user_id where i.user_id=p_user and i.invoice_id=p_invoice and i.status='active' and p.status='active'),0)
 - coalesce((select sum(amount_cents) from public.invoice_payments where user_id=p_user and invoice_id=p_invoice and status='confirmed'),0);
$$;
revoke all on function private.invoice_outstanding(uuid,uuid) from public,anon,authenticated;

create function public.pay_invoice(p_key uuid,p_invoice uuid,p_account uuid,p_amount bigint,p_date date) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); existing public.invoice_payments%rowtype; inv public.credit_card_invoices%rowtype; payment_id uuid;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_key is null or p_amount is null or p_amount<=0 or p_amount>9007199254740991 or p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Pagamento inválido.' using errcode='22023'; end if;
 -- Same user serialization also covers concurrent retries targeting different invoices.
 perform 1 from public.profiles where id=u for update;
 select * into existing from public.invoice_payments where user_id=u and idempotency_key=p_key;
 if found then
  if row(existing.invoice_id,existing.account_id,existing.amount_cents,existing.paid_on) is distinct from row(p_invoice,p_account,p_amount,p_date) then raise exception 'Chave reutilizada com dados diferentes.' using errcode='23505'; end if;
  return existing.id;
 end if;
 select * into inv from public.credit_card_invoices where user_id=u and id=p_invoice for update;
 if not found or inv.status='cancelled' then raise exception 'Fatura indisponível.' using errcode='23514'; end if;
 perform 1 from public.accounts where user_id=u and id=p_account and is_active and opening_balance_date<=p_date for share;
 if not found then raise exception 'Conta ou data incompatível.' using errcode='23514'; end if;
 if p_amount>private.invoice_outstanding(u,p_invoice) then raise exception 'Pagamento excede o saldo da fatura.' using errcode='23514'; end if;
 insert into public.invoice_payments(user_id,idempotency_key,invoice_id,account_id,amount_cents,paid_on) values(u,p_key,p_invoice,p_account,p_amount,p_date) returning id into payment_id;
 return payment_id;
end; $$;

create function public.reverse_invoice_payment(p_payment uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); payment public.invoice_payments%rowtype;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'Informe o motivo do estorno.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into payment from public.invoice_payments where user_id=u and id=p_payment;
 if not found then raise exception 'Pagamento inexistente.' using errcode='42501'; end if;
 perform 1 from public.credit_card_invoices where user_id=u and id=payment.invoice_id for update;
 if payment.status='reversed' then return payment.id; end if;
 update public.invoice_payments set status='reversed',reversed_at=now(),reversal_reason=btrim(p_reason) where id=p_payment and user_id=u;
 return p_payment;
end; $$;

-- Todos os itens disputam a mesma trava da fatura. Após pagamento, corrigir exige estorno.
create function private.guard_invoice_items() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; owner_id uuid;
begin
 owner_id:=new.user_id;
 for target in select distinct x from unnest(case when tg_op='UPDATE' then array[old.invoice_id,new.invoice_id] else array[new.invoice_id] end) x where x is not null order by x loop
  perform 1 from public.credit_card_invoices where user_id=owner_id and id=target and status='open' for update;
  if not found then raise exception 'A fatura precisa estar aberta.' using errcode='23514'; end if;
  if exists(select 1 from public.invoice_payments where user_id=owner_id and invoice_id=target and status='confirmed') then raise exception 'Estorne os pagamentos antes de alterar os itens.' using errcode='23514'; end if;
 end loop;
 return new;
end; $$;
create trigger guard_invoice_items before insert or update on public.transactions for each row execute function private.guard_invoice_items();
create trigger guard_invoice_items before insert or update on public.installments for each row execute function private.guard_invoice_items();
-- Plan cancellation must be orchestrated with its installments in the next migration.
revoke update on public.installment_plans from authenticated;
revoke insert,update on public.invoice_payments from authenticated;
revoke update on public.credit_card_invoices from authenticated;
revoke all on function private.guard_invoice_items() from public,anon,authenticated;
revoke all on function public.pay_invoice(uuid,uuid,uuid,bigint,date) from public,anon;
revoke all on function public.reverse_invoice_payment(uuid,text) from public,anon;
grant execute on function public.pay_invoice(uuid,uuid,uuid,bigint,date) to authenticated;
grant execute on function public.reverse_invoice_payment(uuid,text) to authenticated;


-- 20261031000300_installment_actions.sql
create function public.edit_installment_plan(p_plan uuid,p_version timestamptz,p_description text,p_notes text) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); plan public.installment_plans%rowtype;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_description is null or char_length(btrim(p_description)) not between 1 and 200 or char_length(p_notes)>2000 then raise exception 'Descrição ou observação inválida.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into plan from public.installment_plans where id=p_plan and user_id=u for update;
 if not found then raise exception 'Parcelamento indisponível.' using errcode='42501'; end if;
 if plan.updated_at is distinct from p_version or plan.status<>'active' then raise exception 'Registro alterado: atualize a página.' using errcode='40001'; end if;
 update public.installment_plans set description=btrim(p_description),notes=nullif(btrim(p_notes),'') where id=p_plan and user_id=u;
 return p_plan;
end; $$;
create function public.cancel_installment_plan(p_plan uuid,p_version timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); plan public.installment_plans%rowtype; target uuid;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into plan from public.installment_plans where id=p_plan and user_id=u for update;
 if not found then raise exception 'Parcelamento indisponível.' using errcode='42501'; end if;
 if plan.status='cancelled' then return p_plan; end if;
 if plan.updated_at is distinct from p_version then raise exception 'Registro alterado: atualize a página.' using errcode='40001'; end if;
 for target in select distinct invoice_id from public.installments where user_id=u and installment_plan_id=p_plan order by invoice_id loop
  perform 1 from public.credit_card_invoices where user_id=u and id=target for update;
  if exists(select 1 from public.invoice_payments where user_id=u and invoice_id=target and status='confirmed') then raise exception 'Estorne os pagamentos antes de cancelar o parcelamento.' using errcode='23514'; end if;
 end loop;
 update public.installments set status='cancelled' where user_id=u and installment_plan_id=p_plan and status='active';
 update public.installment_plans set status='cancelled' where user_id=u and id=p_plan;
 return p_plan;
end; $$;
create function public.anticipate_installment_plan(p_key uuid,p_plan uuid,p_invoice uuid,p_account uuid,p_discount bigint,p_date date) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); plan public.installment_plans%rowtype; destination public.credit_card_invoices%rowtype;
 prior private.financial_requests%rowtype; payload jsonb; total numeric:=0; remaining bigint; cut bigint; part record; target uuid; payment uuid;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_key is null or p_discount is null or p_discount<0 or p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Dados inválidos.' using errcode='22023'; end if;
 payload:=jsonb_build_object('plan',p_plan,'invoice',p_invoice,'account',p_account,'discount',p_discount,'date',p_date);
 perform 1 from public.profiles where id=u for update;
 select * into prior from private.financial_requests where user_id=u and request_id=p_key;
 if found then
  if prior.operation<>'anticipate' or prior.payload<>payload then raise exception 'Chave reutilizada com dados diferentes.' using errcode='23505'; end if;
  return prior.result_id;
 end if;
 if exists(select 1 from public.invoice_payments where user_id=u and idempotency_key=p_key) then raise exception 'Chave de pagamento já utilizada.' using errcode='23505'; end if;
 select * into plan from public.installment_plans where user_id=u and id=p_plan and status='active' for update;
 if not found then raise exception 'Parcelamento indisponível.' using errcode='23514'; end if;
 perform 1 from public.credit_cards where user_id=u and id=plan.credit_card_id and allows_early_settlement is true for share;
 if not found then raise exception 'Antecipação não permitida neste cartão.' using errcode='23514'; end if;
 -- Bloqueia todas as faturas em ordem determinística, igual à guarda dos itens.
 for target in select distinct x from (select invoice_id x from public.installments where user_id=u and installment_plan_id=p_plan and status='active' union select p_invoice) ids order by x loop
  perform 1 from public.credit_card_invoices where user_id=u and id=target for update;
 end loop;
 select * into destination from public.credit_card_invoices where user_id=u and id=p_invoice and credit_card_id=plan.credit_card_id and status='open';
 if not found or exists(select 1 from public.invoice_payments where user_id=u and invoice_id=p_invoice and status='confirmed') then raise exception 'Fatura de destino indisponível.' using errcode='23514'; end if;
 -- Somente parcelas futuras, não antecipadas, em faturas sem pagamentos.
 select coalesce(sum(i.amount_cents),0) into total from public.installments i join public.credit_card_invoices f on f.id=i.invoice_id and f.user_id=i.user_id
 where i.user_id=u and i.installment_plan_id=p_plan and i.status='active' and i.anticipated_on is null and f.status='open' and f.due_date>destination.due_date
 and not exists(select 1 from public.invoice_payments p where p.user_id=u and p.invoice_id=i.invoice_id and p.status='confirmed');
 if total<=0 or total>9007199254740991 or p_discount>total then raise exception 'Desconto ou saldo elegível inválido.' using errcode='23514'; end if;
 remaining:=p_discount;
 for part in select i.* from public.installments i join public.credit_card_invoices f on f.id=i.invoice_id and f.user_id=i.user_id
 where i.user_id=u and i.installment_plan_id=p_plan and i.status='active' and i.anticipated_on is null and f.status='open' and f.due_date>destination.due_date
 and not exists(select 1 from public.invoice_payments p where p.user_id=u and p.invoice_id=i.invoice_id and p.status='confirmed') order by i.installment_number loop
  cut:=least(remaining,part.amount_cents);remaining:=remaining-cut;
  update public.installments set invoice_id=p_invoice,discount_cents=cut,anticipated_on=p_date where id=part.id and user_id=u;
 end loop;
 payment:=p_plan;
 if total>p_discount then payment:=public.pay_invoice(p_key,p_invoice,p_account,(total-p_discount)::bigint,p_date); end if;
 insert into private.financial_requests values(u,p_key,'anticipate',payload,payment);
 return payment;
end; $$;
revoke all on function public.edit_installment_plan(uuid,timestamptz,text,text),public.cancel_installment_plan(uuid,timestamptz),public.anticipate_installment_plan(uuid,uuid,uuid,uuid,bigint,date) from public,anon;
grant execute on function public.edit_installment_plan(uuid,timestamptz,text,text),public.cancel_installment_plan(uuid,timestamptz),public.anticipate_installment_plan(uuid,uuid,uuid,uuid,bigint,date) to authenticated;


-- 20261031000400_recurrence_actions.sql
-- Datas geradas a partir da âncora original, nunca da ocorrência anterior.
create function public.generate_recurrences(p_rule uuid,p_until date) returns integer
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); rule public.recurring_transactions%rowtype; n integer:=0; occurrence date; affected integer; generated integer:=0;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_until is null or p_until>(now() at time zone 'America/Sao_Paulo')::date+interval '2 years' then raise exception 'Horizonte máximo: dois anos.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into rule from public.recurring_transactions where user_id=u and id=p_rule and is_active for update;
 if not found then raise exception 'Recorrência indisponível.' using errcode='23514'; end if;
 if rule.payment_method='credit' then raise exception 'Recorrência no crédito exige fatura explícita.' using errcode='23514'; end if;
 perform 1 from public.categories where id=rule.category_id and user_id=u and is_active and kind=rule.kind for share;
 if not found then raise exception 'Categoria indisponível.' using errcode='23514'; end if;
 perform 1 from public.accounts where id=rule.account_id and user_id=u and is_active for share;
 if not found then raise exception 'Conta indisponível.' using errcode='23514'; end if;
 loop
  occurrence:=case rule.interval_unit when 'day' then rule.starts_on+n*rule.interval_count when 'week' then rule.starts_on+n*rule.interval_count*7 when 'month' then (rule.starts_on+make_interval(months=>n*rule.interval_count))::date when 'year' then (rule.starts_on+make_interval(years=>n*rule.interval_count))::date end;
  exit when occurrence>p_until or (rule.ends_on is not null and occurrence>rule.ends_on);
  if n>=10000 then raise exception 'Reduza o período da recorrência.' using errcode='22023'; end if;
  insert into public.transactions(user_id,description,kind,amount_cents,category_id,occurred_on,due_date,payment_method,account_id,status,recurring_transaction_id,recurrence_on,notes)
  values(u,rule.description,rule.kind,rule.amount_cents,rule.category_id,occurrence,occurrence,rule.payment_method,rule.account_id,'pending',rule.id,occurrence,rule.notes)
  on conflict(user_id,recurring_transaction_id,recurrence_on) do nothing;
  get diagnostics affected=row_count;generated:=generated+affected;n:=n+1;
 end loop;
 return generated;
end; $$;
create function public.update_recurrence(p_rule uuid,p_version timestamptz,p_description text,p_amount bigint,p_end date,p_active boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); rule public.recurring_transactions%rowtype;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_description is null or char_length(btrim(p_description)) not between 1 and 200 or p_amount is null or p_amount not between 1 and 9007199254740991 or p_active is null then raise exception 'Dados inválidos.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into rule from public.recurring_transactions where user_id=u and id=p_rule for update;
 if not found then raise exception 'Recorrência indisponível.' using errcode='42501'; end if;
 if rule.updated_at is distinct from p_version then raise exception 'Registro alterado: atualize a página.' using errcode='40001'; end if;
 if p_end<rule.starts_on then raise exception 'Fim anterior ao início.' using errcode='23514'; end if;
 update public.recurring_transactions set description=btrim(p_description),amount_cents=p_amount,ends_on=p_end,is_active=p_active where user_id=u and id=p_rule;
 -- Alteração vale apenas para ocorrências ainda não geradas. Encerramento não apaga débitos existentes.
 return p_rule;
end; $$;
revoke update on public.recurring_transactions from authenticated;
revoke all on function public.generate_recurrences(uuid,date),public.update_recurrence(uuid,timestamptz,text,bigint,date,boolean) from public,anon;
grant execute on function public.generate_recurrences(uuid,date),public.update_recurrence(uuid,timestamptz,text,bigint,date,boolean) to authenticated;


-- 20261031000500_credit_operations.sql
-- Compra no dia do fechamento pertence ao próximo ciclo; dias limitados ao fim do mês.
create function private.credit_invoice(p_user uuid,p_card uuid,p_occurrence date,p_month date default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare card public.credit_cards%rowtype; closing_month date; due_month date; closing_on date; due_on date; invoice public.credit_card_invoices%rowtype;
begin
 select * into card from public.credit_cards where user_id=p_user and id=p_card and is_active for share;
 if not found or p_occurrence is null then raise exception 'Cartão ou data inválidos.' using errcode='23514'; end if;
 if p_month is not null then
  if extract(day from p_month)<>1 then raise exception 'Mês de fatura inválido.' using errcode='22023'; end if;
  due_month:=p_month;closing_month:=(p_month-case when card.due_day<=card.closing_day then interval '1 month' else interval '0 month' end)::date;
 else
  closing_month:=date_trunc('month',p_occurrence)::date;
  closing_on:=closing_month+least(card.closing_day,extract(day from closing_month+interval '1 month - 1 day')::integer)-1;
  if p_occurrence>=closing_on then closing_month:=(closing_month+interval '1 month')::date; end if;
  due_month:=(closing_month+case when card.due_day<=card.closing_day then interval '1 month' else interval '0 month' end)::date;
 end if;
 closing_on:=closing_month+least(card.closing_day,extract(day from closing_month+interval '1 month - 1 day')::integer)-1;
 due_on:=due_month+least(card.due_day,extract(day from due_month+interval '1 month - 1 day')::integer)-1;
 insert into public.credit_card_invoices(user_id,credit_card_id,reference_month,closing_date,due_date) values(p_user,p_card,due_month,closing_on,due_on) on conflict(user_id,credit_card_id,reference_month) do nothing;
 select * into invoice from public.credit_card_invoices where user_id=p_user and credit_card_id=p_card and reference_month=due_month for update;
 if invoice.status<>'open' or invoice.due_date<p_occurrence or exists(select 1 from public.invoice_payments where user_id=p_user and invoice_id=invoice.id and status='confirmed') then raise exception 'Fatura indisponível para novos itens.' using errcode='23514'; end if;
 return invoice.id;
end; $$;
revoke all on function private.credit_invoice(uuid,uuid,date,date) from public,anon,authenticated;
create function public.create_credit_purchase(p_key uuid,p_description text,p_card uuid,p_category uuid,p_amount bigint,p_date date,p_month date default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); payload jsonb; prior private.financial_requests%rowtype; invoice uuid; result uuid; due_on date;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_key is null or p_amount is null or p_amount not between 1 and 9007199254740991 or p_date is null or p_description is null or char_length(btrim(p_description)) not between 1 and 200 then raise exception 'Dados inválidos.' using errcode='22023'; end if;
 payload:=jsonb_build_object('description',btrim(p_description),'card',p_card,'category',p_category,'amount',p_amount,'date',p_date,'month',p_month);
 perform 1 from public.profiles where id=u for update;
 select * into prior from private.financial_requests where user_id=u and request_id=p_key;
 if found then
  if prior.operation<>'credit' or prior.payload<>payload then raise exception 'Tentativa com dados diferentes.' using errcode='23505'; end if;
  return prior.result_id;
 end if;
 perform 1 from public.categories where user_id=u and id=p_category and kind='expense' and is_active for share;
 if not found then raise exception 'Categoria indisponível.' using errcode='23514'; end if;
 invoice:=private.credit_invoice(u,p_card,p_date,p_month);
 select due_date into due_on from public.credit_card_invoices where id=invoice and user_id=u;
 insert into public.transactions(user_id,idempotency_key,description,kind,amount_cents,category_id,occurred_on,due_date,payment_method,credit_card_id,invoice_id,status)
 values(u,p_key,btrim(p_description),'expense',p_amount,p_category,p_date,due_on,'credit',p_card,invoice,'posted') returning id into result;
 insert into private.financial_requests values(u,p_key,'credit',payload,result);
 return result;
end; $$;
revoke all on function public.create_credit_purchase(uuid,text,uuid,uuid,bigint,date,date) from public,anon;
grant execute on function public.create_credit_purchase(uuid,text,uuid,uuid,bigint,date,date) to authenticated;
create or replace function public.generate_recurrences(p_rule uuid,p_until date) returns integer
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); rule public.recurring_transactions%rowtype; n integer:=0; occurrence date; affected integer; generated integer:=0; invoice uuid; due_on date;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_until is null or p_until>(now() at time zone 'America/Sao_Paulo')::date+interval '2 years' then raise exception 'Horizonte máximo: dois anos.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into rule from public.recurring_transactions where user_id=u and id=p_rule and is_active for update;
 if not found then raise exception 'Recorrência indisponível.' using errcode='23514'; end if;

 perform 1 from public.categories where id=rule.category_id and user_id=u and is_active and kind=rule.kind for share;
 if not found then raise exception 'Categoria indisponível.' using errcode='23514'; end if;
 if rule.payment_method<>'credit' then
 perform 1 from public.accounts where id=rule.account_id and user_id=u and is_active for share;
 if not found then raise exception 'Conta indisponível.' using errcode='23514'; end if;
 end if;
 loop
  occurrence:=case rule.interval_unit when 'day' then rule.starts_on+n*rule.interval_count when 'week' then rule.starts_on+n*rule.interval_count*7 when 'month' then (rule.starts_on+make_interval(months=>n*rule.interval_count))::date when 'year' then (rule.starts_on+make_interval(years=>n*rule.interval_count))::date end;
  exit when occurrence>p_until or (rule.ends_on is not null and occurrence>rule.ends_on);
  if n>=10000 then raise exception 'Reduza o período da recorrência.' using errcode='22023'; end if;
  if exists(select 1 from public.transactions where user_id=u and recurring_transaction_id=rule.id and recurrence_on=occurrence) then n:=n+1;continue;end if;
  invoice:=null;due_on:=occurrence;
  if rule.payment_method='credit' then
   invoice:=private.credit_invoice(u,rule.credit_card_id,occurrence);
   select due_date into due_on from public.credit_card_invoices where id=invoice and user_id=u;
  end if;
  insert into public.transactions(user_id,description,kind,amount_cents,category_id,occurred_on,due_date,payment_method,account_id,credit_card_id,invoice_id,status,recurring_transaction_id,recurrence_on,notes)
  values(u,rule.description,rule.kind,rule.amount_cents,rule.category_id,occurrence,due_on,rule.payment_method,rule.account_id,rule.credit_card_id,invoice,case when rule.payment_method='credit' then 'posted' else 'pending' end,rule.id,occurrence,rule.notes)
  on conflict(user_id,recurring_transaction_id,recurrence_on) do nothing;
  get diagnostics affected=row_count;generated:=generated+affected;n:=n+1;
 end loop;
 return generated;
end; $$;



-- 20261031000600_record_editing.sql
create function public.edit_financial_record(p_table text,p_id uuid,p_version timestamptz,p_changes jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); current_row jsonb; merged jsonb; allowed text[]; a public.accounts%rowtype; c public.categories%rowtype; card public.credit_cards%rowtype; t public.transactions%rowtype;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_table not in ('accounts','categories','credit_cards','transactions') or p_table is null or p_changes is null or jsonb_typeof(p_changes)<>'object' then raise exception 'Operação inválida.' using errcode='22023'; end if;
 allowed:=case p_table when 'accounts' then array['name','institution','kind','opening_balance_cents','opening_balance_date','is_active'] when 'categories' then array['name','color','is_active'] when 'credit_cards' then array['name','institution','color','closing_day','due_day','credit_limit_cents','allows_early_settlement','is_active'] else array['description','amount_cents','category_id','account_id','occurred_on','due_date','settled_on','status','notes'] end;
 if exists(select 1 from jsonb_object_keys(p_changes) k where not(k=any(allowed))) then raise exception 'Campo não editável.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 execute format('select to_jsonb(r) from public.%I r where id=$1 and user_id=$2 for update',p_table) into current_row using p_id,u;
 if current_row is null then raise exception 'Registro indisponível.' using errcode='42501'; end if;
 if (current_row->>'updated_at')::timestamptz is distinct from p_version then raise exception 'Registro alterado: atualize a página.' using errcode='40001'; end if;
 merged:=current_row||p_changes;
 if p_table='accounts' then
  a:=jsonb_populate_record(null::public.accounts,merged);
  if exists(select 1 from public.transactions where user_id=u and account_id=p_id and status='settled' and settled_on<a.opening_balance_date) or exists(select 1 from public.invoice_payments where user_id=u and account_id=p_id and status='confirmed' and paid_on<a.opening_balance_date) then raise exception 'A data do saldo inicial ultrapassa uma liquidação.' using errcode='23514'; end if;
  update public.accounts set name=a.name,institution=a.institution,kind=a.kind,opening_balance_cents=a.opening_balance_cents,opening_balance_date=a.opening_balance_date,is_active=a.is_active where id=p_id and user_id=u;
 elsif p_table='categories' then
  c:=jsonb_populate_record(null::public.categories,merged);
  update public.categories set name=c.name,color=c.color,is_active=c.is_active where id=p_id and user_id=u;
 elsif p_table='credit_cards' then
  card:=jsonb_populate_record(null::public.credit_cards,merged);
  update public.credit_cards set name=card.name,institution=card.institution,color=card.color,closing_day=card.closing_day,due_day=card.due_day,credit_limit_cents=card.credit_limit_cents,allows_early_settlement=card.allows_early_settlement,is_active=card.is_active where id=p_id and user_id=u;
 else
  if current_row->>'status'='cancelled' then raise exception 'Lançamento cancelado não pode ser editado.' using errcode='23514'; end if;
  t:=jsonb_populate_record(null::public.transactions,merged);
  if t.status='cancelled' and p_changes <> jsonb_build_object('status','cancelled') then raise exception 'Cancele sem alterar outros campos.' using errcode='22023'; end if;
  if t.status<>'cancelled' then
   perform 1 from public.categories where id=t.category_id and user_id=u and kind=t.kind and is_active for share;
   if not found then raise exception 'Categoria indisponível.' using errcode='23514'; end if;
  end if;
  if t.payment_method='credit' then
   if t.account_id is not null or t.settled_on is not null or t.status not in ('posted','cancelled') or t.due_date is distinct from (current_row->>'due_date')::date then raise exception 'Crédito é liquidado pela fatura.' using errcode='23514'; end if;
   if t.occurred_on>t.due_date then raise exception 'Compra posterior ao vencimento.' using errcode='23514'; end if;
  elsif t.status='settled' then
   perform 1 from public.accounts where id=t.account_id and user_id=u and is_active and opening_balance_date<=t.settled_on for share;
   if not found or t.settled_on>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Conta ou data de liquidação inválida.' using errcode='23514'; end if;
  end if;
  if t.status in ('pending','cancelled') then t.settled_on:=null;end if;
  update public.transactions set description=t.description,amount_cents=t.amount_cents,category_id=t.category_id,account_id=t.account_id,occurred_on=t.occurred_on,due_date=t.due_date,settled_on=t.settled_on,status=t.status,notes=t.notes where id=p_id and user_id=u;
 end if;
 return p_id;
end; $$;
revoke update on public.accounts,public.categories,public.credit_cards,public.transactions from authenticated;
revoke all on function public.edit_financial_record(text,uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.edit_financial_record(text,uuid,timestamptz,jsonb) to authenticated;

-- Também protege inserções diretas permitidas pelo schema inicial.
create function private.validate_transaction_references() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=new.user_id for update;
 if new.status='cancelled' then return new;end if;
 perform 1 from public.categories where user_id=new.user_id and id=new.category_id and kind=new.kind and is_active for share;
 if not found then raise exception 'Categoria indisponível.' using errcode='23514';end if;
 if new.payment_method='credit' then
  perform 1 from public.credit_cards where user_id=new.user_id and id=new.credit_card_id and is_active for share;
  if not found then raise exception 'Cartão indisponível.' using errcode='23514';end if;
 elsif new.account_id is not null then
  perform 1 from public.accounts where user_id=new.user_id and id=new.account_id and is_active and (new.settled_on is null or opening_balance_date<=new.settled_on) for share;
  if not found then raise exception 'Conta ou data de liquidação inválida.' using errcode='23514';end if;
 end if;
 if new.settled_on>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Liquidação futura não permitida.' using errcode='23514';end if;
 return new;
end; $$;
revoke all on function private.validate_transaction_references() from public,anon,authenticated;
create trigger financial_transaction_rules before insert or update on public.transactions for each row execute function private.validate_transaction_references();


notify pgrst, 'reload schema';
commit;
select 'Etapa 3 aplicada com sucesso. Recarregue o aplicativo para iniciar a validação.' as resultado;
