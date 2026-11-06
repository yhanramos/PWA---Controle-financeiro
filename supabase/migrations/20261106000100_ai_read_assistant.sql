-- Etapa 5, fase 1: assistente de consulta. Aplicar após as migrations da Etapa 3.
begin;
create table private.ai_requests (
 user_id uuid not null references public.profiles(id) on delete cascade,
 request_id uuid not null,
 conversation_id uuid not null,
 message text not null check(char_length(message) between 1 and 2000),
 state text not null default 'processing' check(state in ('processing','complete','failed')),
 response text,
 created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
create index ai_requests_created_idx on private.ai_requests(created_at);
revoke all on private.ai_requests from public,anon,authenticated;

create function public.begin_ai_request(p_request uuid,p_conversation uuid,p_message text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); prior private.ai_requests%rowtype; day_start timestamptz:=date_trunc('day',now());
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_request is null or p_conversation is null or p_message is null or char_length(btrim(p_message)) not between 1 and 2000 then
  raise exception 'Mensagem inválida.' using errcode='22023'; end if;
 -- Serializa a reserva global antes dos limites; nenhuma chamada ao provedor ocorre sem reserva.
 perform pg_advisory_xact_lock(61106001);
 delete from private.ai_requests where created_at < now()-interval '30 days';
 delete from public.chat_messages where created_at < now()-interval '30 days';
 select * into prior from private.ai_requests where user_id=u and request_id=p_request;
 if found then
  if prior.message<>btrim(p_message) or prior.conversation_id<>p_conversation then
   raise exception 'Requisição reutilizada com outro conteúdo.' using errcode='23505'; end if;
  return jsonb_build_object('state',prior.state,'response',prior.response);
 end if;
 if (select count(*) from private.ai_requests where created_at>=day_start)>=500
 or (select count(*) from private.ai_requests where user_id=u and created_at>=day_start)>=20
 or (select count(*) from private.ai_requests where user_id=u and created_at>now()-interval '1 minute')>=5 then
  raise exception 'Limite de uso atingido.' using errcode='P0001'; end if;
 insert into private.ai_requests(user_id,request_id,conversation_id,message) values(u,p_request,p_conversation,btrim(p_message));
 return jsonb_build_object('state','reserved');
end; $$;
revoke all on function public.begin_ai_request(uuid,uuid,text) from public,anon;
grant execute on function public.begin_ai_request(uuid,uuid,text) to authenticated;

create function public.finish_ai_request(p_user uuid,p_request uuid,p_response text) returns void
language plpgsql security definer set search_path='' as $$
declare r private.ai_requests%rowtype;
begin
 select * into r from private.ai_requests where user_id=p_user and request_id=p_request for update;
 if not found or r.state<>'processing' then return; end if;
 if p_response is null then update private.ai_requests set state='failed' where user_id=p_user and request_id=p_request; return; end if;
 if char_length(btrim(p_response)) not between 1 and 8000 then raise exception 'Resposta inválida.'; end if;
 insert into public.chat_messages(user_id,conversation_id,request_id,role,content)
 values(p_user,r.conversation_id,p_request,'user',r.message),(p_user,r.conversation_id,p_request,'assistant',p_response);
 update private.ai_requests set state='complete',response=p_response where user_id=p_user and request_id=p_request;
end; $$;
revoke all on function public.finish_ai_request(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.finish_ai_request(uuid,uuid,text) to service_role;

-- O navegador não pode fabricar histórico para o assistente.
revoke insert on public.chat_messages from authenticated;

create function public.ai_financial_overview(p_month date) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); today date:=(now() at time zone 'America/Sao_Paulo')::date;
 cash numeric; income numeric; expenses numeric; invoices numeric;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_month is null or extract(day from p_month)<>1 or p_month<'1900-01-01' or p_month>'9999-12-01' then
  raise exception 'Mês inválido.' using errcode='22023'; end if;
 select coalesce(sum(opening_balance_cents),0) into cash from public.accounts where user_id=u and opening_balance_date<=today;
 select cash+coalesce(sum(case when kind='income' then amount_cents else -amount_cents end),0) into cash
 from public.transactions where user_id=u and status='settled' and payment_method<>'credit' and settled_on<=today;
 select cash-coalesce(sum(amount_cents),0) into cash from public.invoice_payments where user_id=u and status='confirmed' and paid_on<=today;
 select coalesce(sum(amount_cents) filter(where kind='income'),0),coalesce(sum(amount_cents) filter(where kind='expense'),0)
 into income,expenses from public.transactions where user_id=u and status='pending' and payment_method<>'credit' and invoice_id is null
 and due_date>=p_month and due_date<(p_month+interval '1 month');
 with selected as (
  select id from public.credit_card_invoices where user_id=u and status<>'cancelled' and due_date>=p_month and due_date<(p_month+interval '1 month')
 ), amounts as (
  select f.id,
  coalesce((select sum(t.amount_cents) from public.transactions t where t.user_id=u and t.invoice_id=f.id and t.status='posted' and t.kind='expense' and t.payment_method='credit'),0)
  +coalesce((select sum(i.amount_cents-i.discount_cents) from public.installments i join public.installment_plans p on p.id=i.installment_plan_id and p.user_id=i.user_id
   where i.user_id=u and i.invoice_id=f.id and i.status='active' and p.status='active'),0)
  -coalesce((select sum(ip.amount_cents) from public.invoice_payments ip where ip.user_id=u and ip.invoice_id=f.id and ip.status='confirmed'),0) balance
  from selected f
 ) select case when min(balance)<0 then null else coalesce(sum(balance),0) end into invoices from amounts;
 if invoices is null then raise exception 'Saldo de fatura inconsistente.'; end if;
 return jsonb_build_object('today',today,'month',to_char(p_month,'YYYY-MM'),'cash',cash::text,'income',income::text,'expenses',expenses::text,'invoices',invoices::text);
end; $$;
revoke all on function public.ai_financial_overview(date) from public,anon;
grant execute on function public.ai_financial_overview(date) to authenticated;
commit;
