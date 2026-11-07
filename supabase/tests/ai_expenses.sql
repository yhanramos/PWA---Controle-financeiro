-- Casos futuros; NÃO EXECUTADOS. Somente banco descartável, todas as migrations aplicadas.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000091','ai-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000092','ai-b@example.invalid');
insert into public.accounts(id,user_id,name,opening_balance_date) values
 ('20000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000091','Conta AI','2020-01-01');
insert into public.credit_cards(id,user_id,name,institution,closing_day,due_day) values
 ('30000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000091','Cartão AI','Banco',20,28);
-- Simula falha na finalização técnica após o INSERT da despesa; tudo deve reverter.
create function pg_temp.fail_ai_finish() returns trigger language plpgsql as $$
begin
 if new.message_hash=repeat('f',64) then raise exception 'Falha simulada de finalização' using errcode='23514'; end if;
 return new;
end; $$;
create trigger fail_ai_finish before update on private.ai_requests for each row execute function pg_temp.fail_ai_finish();
do $$
declare
 u uuid:='10000000-0000-4000-8000-000000000091';
 account uuid:='20000000-0000-4000-8000-000000000091';
 card uuid:='30000000-0000-4000-8000-000000000091';
 category uuid; other_category uuid; req uuid:=gen_random_uuid(); failed uuid:=gen_random_uuid(); credit_req uuid:=gen_random_uuid();
 history_req uuid:=gen_random_uuid(); conversation uuid:=gen_random_uuid(); result text;
begin
 if has_function_privilege('authenticated','public.finish_ai_expense(uuid,uuid,text,bigint,uuid,date,text,uuid,uuid,text)','EXECUTE')
 or has_function_privilege('anon','public.finish_ai_expense(uuid,uuid,text,bigint,uuid,date,text,uuid,uuid,text)','EXECUTE')
 or not has_function_privilege('service_role','public.finish_ai_expense(uuid,uuid,text,bigint,uuid,date,text,uuid,uuid,text)','EXECUTE') then
  raise exception 'FAIL: permissões da escrita';
 end if;
 select id into category from public.categories where user_id=u and kind='expense' limit 1;
 select id into other_category from public.categories where user_id='10000000-0000-4000-8000-000000000092' and kind='expense' limit 1;
 insert into private.ai_requests(user_id,request_id,conversation_id,message_hash) values
 (u,req,conversation,repeat('a',64)),(u,failed,conversation,repeat('b',64)),
 (u,credit_req,conversation,repeat('c',64)),(u,history_req,conversation,repeat('f',64));
 result:=public.finish_ai_expense(u,req,'Gasolina',10000,category,'2026-01-10','pix',account,null,'Despesa salva');
 if result<>'Despesa salva' then raise exception 'FAIL: resposta'; end if;
 perform public.finish_ai_expense(u,req,'Gasolina',10000,category,'2026-01-10','pix',account,null,'Duplicada');
 if (select count(*) from public.transactions where user_id=u and idempotency_key=req)<>1
 or exists(select 1 from public.chat_messages where user_id=u)
 or (select response from private.ai_requests where user_id=u and request_id=req)='Despesa salva'
 or not exists(select 1 from public.transactions where user_id=u and idempotency_key=req and amount_cents=10000 and status='settled' and settled_on='2026-01-10') then
  raise exception 'FAIL: escrita, histórico ou idempotência';
 end if;
 begin
  perform public.finish_ai_expense(u,failed,'Gasolina',10000,other_category,'2026-01-10','pix',account,null,'Salvo');
  raise exception 'FAIL: categoria de outro usuário aceita';
 exception when check_violation then null; end;
 begin
  perform public.finish_ai_expense(u,failed,'Gasolina',10000,category,'2019-01-10','pix',account,null,'Salvo');
  raise exception 'FAIL: pagamento anterior ao saldo inicial';
 exception when check_violation then null; end;
 begin
  perform public.finish_ai_expense(u,failed,'Gasolina',0,category,'2026-01-10','pix',account,null,'Salvo');
  raise exception 'FAIL: valor zero aceito';
 exception when invalid_parameter_value then null; end;
 if exists(select 1 from public.transactions where user_id=u and idempotency_key=failed) then raise exception 'FAIL: escrita parcial'; end if;
 perform public.finish_ai_expense(u,credit_req,'Mercado',8050,category,'2026-01-10','credit',null,card,'Compra salva');
 if not exists(select 1 from public.transactions where user_id=u and idempotency_key=credit_req and status='posted' and account_id is null and settled_on is null and invoice_id is not null and due_date='2026-01-28') then
  raise exception 'FAIL: crédito sem caixa e vencimento';
 end if;
 -- A falha do gatilho de teste ocorre ao marcar a reserva como concluída.
 begin
  perform public.finish_ai_expense(u,history_req,'Gasolina',10000,category,'2026-01-10','pix',account,null,'Salvo');
  raise exception 'FAIL: finalização deveria falhar';
 exception when check_violation then null; end;
 if exists(select 1 from public.transactions where user_id=u and idempotency_key=history_req)
 or (select state from private.ai_requests where user_id=u and request_id=history_req)<>'processing' then
  raise exception 'FAIL: atomicidade com controle técnico';
 end if;
end; $$;
rollback;
