-- Rascunho anterior nunca aplicado: criação atômica de plano e faturas.
begin;
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
commit;
