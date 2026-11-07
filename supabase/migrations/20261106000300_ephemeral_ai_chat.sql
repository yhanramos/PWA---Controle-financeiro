-- Conversa somente na memória da tela; mantém apenas controle técnico de reenvios.
-- Aplicar depois de 20261106000200_ai_expenses.sql. Não altera despesas/faturas.
begin;

-- Remove conteúdo das conversas anteriores, conforme nova política do aplicativo.
delete from public.chat_messages;
update private.ai_requests
set message=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(btrim(message),'UTF8')),'hex'),
 response=case when state='complete' then 'Esta solicitação já foi concluída e não foi executada novamente. Se era um registro de gasto, confira Movimentações. O conteúdo da conversa não é armazenado.' else null end;
alter table private.ai_requests rename column message to message_hash;
alter table private.ai_requests drop constraint ai_requests_message_check;
alter table private.ai_requests add constraint ai_requests_message_hash_check check(message_hash ~ '^[0-9a-f]{64}$');

create or replace function public.begin_ai_request(p_request uuid,p_conversation uuid,p_message text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); prior private.ai_requests%rowtype; day_start timestamptz:=date_trunc('day',now()); fingerprint text;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_request is null or p_conversation is null or p_message is null or char_length(btrim(p_message)) not between 1 and 2000 then
  raise exception 'Mensagem inválida.' using errcode='22023'; end if;
 fingerprint:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(btrim(p_message),'UTF8')),'hex');
 perform pg_advisory_xact_lock(61106001);
 delete from private.ai_requests where created_at < now()-interval '30 days';
 select * into prior from private.ai_requests where user_id=u and request_id=p_request;
 if found then
  if prior.message_hash<>fingerprint or prior.conversation_id<>p_conversation then
   raise exception 'Requisição reutilizada com outro conteúdo.' using errcode='23505'; end if;
  return jsonb_build_object('state',prior.state,'response',prior.response);
 end if;
 if (select count(*) from private.ai_requests where created_at>=day_start)>=500
 or (select count(*) from private.ai_requests where user_id=u and created_at>=day_start)>=20
 or (select count(*) from private.ai_requests where user_id=u and created_at>now()-interval '1 minute')>=5 then
  raise exception 'Limite de uso atingido.' using errcode='P0001'; end if;
 insert into private.ai_requests(user_id,request_id,conversation_id,message_hash) values(u,p_request,p_conversation,fingerprint);
 return jsonb_build_object('state','reserved');
end; $$;

create or replace function public.finish_ai_request(p_user uuid,p_request uuid,p_response text) returns void
language plpgsql security definer set search_path='' as $$
declare r private.ai_requests%rowtype;
begin
 select * into r from private.ai_requests where user_id=p_user and request_id=p_request for update;
 if not found or r.state<>'processing' then return; end if;
 if p_response is null then update private.ai_requests set state='failed',response=null where user_id=p_user and request_id=p_request; return; end if;
 if char_length(btrim(p_response)) not between 1 and 8000 then raise exception 'Resposta inválida.'; end if;
 -- Resposta detalhada volta somente pela Edge Function; não persiste texto financeiro/conversa.
 update private.ai_requests set state='complete',
 response='Esta solicitação já foi concluída e não foi executada novamente. Se era um registro de gasto, confira Movimentações. O conteúdo da conversa não é armazenado.'
 where user_id=p_user and request_id=p_request;
end; $$;

revoke all on function public.begin_ai_request(uuid,uuid,text) from public,anon;
grant execute on function public.begin_ai_request(uuid,uuid,text) to authenticated;
revoke all on function public.finish_ai_request(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.finish_ai_request(uuid,uuid,text) to service_role;
revoke insert on public.chat_messages from authenticated;
commit;
