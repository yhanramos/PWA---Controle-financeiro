-- Regressão futura, NÃO EXECUTADA. Banco descartável com todas as migrations.
begin;
insert into auth.users(id,email) values('10000000-0000-4000-8000-000000000093','ai-ephemeral@example.invalid');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000093',true);
do $$
declare u uuid:=auth.uid(); req uuid:=gen_random_uuid(); conversation uuid:=gen_random_uuid(); result jsonb;
begin
 result:=public.begin_ai_request(req,conversation,'Qual é meu saldo?');
 if result->>'state'<>'reserved' then raise exception 'FAIL: reserva'; end if;
 if not exists(select 1 from private.ai_requests where user_id=u and request_id=req
 and message_hash=encode(sha256(convert_to('Qual é meu saldo?','UTF8')),'hex')) then
  raise exception 'FAIL: hash da mensagem';
 end if;
 perform public.finish_ai_request(u,req,'Seu saldo é R$ 123,45');
 if exists(select 1 from public.chat_messages where user_id=u)
 or exists(select 1 from private.ai_requests where user_id=u and response like '%123,45%') then
  raise exception 'FAIL: conteúdo de conversa persistido';
 end if;
 result:=public.begin_ai_request(req,conversation,'Qual é meu saldo?');
 if result->>'state'<>'complete' or result->>'response' is null then raise exception 'FAIL: reenvio seguro'; end if;
 begin
  perform public.begin_ai_request(req,conversation,'Gastei 100 reais');
  raise exception 'FAIL: reutilização com texto diferente';
 exception when unique_violation then null; end;
 if (select count(*) from private.ai_requests where user_id=u and request_id=req)<>1 then raise exception 'FAIL: reserva duplicada'; end if;
end; $$;
rollback;
