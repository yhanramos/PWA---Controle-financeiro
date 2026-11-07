-- Etapa 5: gravação de despesa e resposta na mesma transação.
begin;
create function public.finish_ai_expense(
 p_user uuid,p_request uuid,p_description text,p_amount bigint,p_category uuid,
 p_date date,p_method text,p_account uuid,p_card uuid,p_response text
) returns text
language plpgsql security definer set search_path='' as $$
declare r private.ai_requests%rowtype; invoice uuid; due_on date:=p_date;
begin
 -- Somente a Edge Function autenticada pode chamar; p_user vem de getUser.
 perform 1 from public.profiles where id=p_user for update;
 select * into r from private.ai_requests where user_id=p_user and request_id=p_request for update;
 if not found then raise exception 'Reserva ausente.' using errcode='22023'; end if;
 if r.state='complete' then return r.response; end if;
 if r.state<>'processing' then raise exception 'Reserva indisponível.' using errcode='22023'; end if;
 if p_amount is null or p_amount not between 1 and 9007199254740991
 or p_description is null or char_length(btrim(p_description)) not between 1 and 200
 or p_response is null or char_length(btrim(p_response)) not between 1 and 8000
 or p_date is null or p_date<'1900-01-01' or p_date>(now() at time zone 'America/Sao_Paulo')::date
 or p_method is null or p_method not in ('cash','pix','debit','bank_transfer','credit') then
  raise exception 'Despesa inválida.' using errcode='22023';
 end if;
 perform 1 from public.categories where user_id=p_user and id=p_category and kind='expense' and is_active for share;
 if not found then raise exception 'Categoria indisponível.' using errcode='23514'; end if;
 if p_method='credit' then
  if p_card is null or p_account is not null then raise exception 'Informe apenas o cartão.' using errcode='22023'; end if;
  invoice:=private.credit_invoice(p_user,p_card,p_date);
  select due_date into due_on from public.credit_card_invoices where id=invoice and user_id=p_user;
 else
  if p_card is not null then raise exception 'Despesa fora do crédito.' using errcode='22023'; end if;
  perform 1 from public.accounts where user_id=p_user and id=p_account and is_active and opening_balance_date<=p_date for share;
  if not found then raise exception 'Conta indisponível para esta data.' using errcode='23514'; end if;
 end if;
 insert into public.transactions(user_id,idempotency_key,description,kind,amount_cents,category_id,
 occurred_on,due_date,settled_on,payment_method,account_id,credit_card_id,invoice_id,status)
 values(p_user,p_request,btrim(p_description),'expense',p_amount,p_category,p_date,due_on,
 case when p_method='credit' then null else p_date end,p_method,p_account,p_card,invoice,
 case when p_method='credit' then 'posted' else 'settled' end);
 perform public.finish_ai_request(p_user,p_request,p_response);
 return p_response;
end; $$;
revoke all on function public.finish_ai_expense(uuid,uuid,text,bigint,uuid,date,text,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.finish_ai_expense(uuid,uuid,text,bigint,uuid,date,text,uuid,uuid,text) to service_role;
commit;
