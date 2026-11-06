begin;
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

commit;
