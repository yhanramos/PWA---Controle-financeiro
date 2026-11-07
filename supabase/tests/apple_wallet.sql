-- NÃO EXECUTADO. Somente banco descartável com todas as migrations aplicadas.
begin;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000081','wallet-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000082','wallet-b@example.invalid');
insert into public.credit_cards(id,user_id,name,institution,closing_day,due_day) values
 ('30000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000081','Wallet A','Banco',20,28),
 ('30000000-0000-4000-8000-000000000082','10000000-0000-4000-8000-000000000082','Wallet B','Banco',20,28);
do $$
declare u uuid:='10000000-0000-4000-8000-000000000081'; card uuid:='30000000-0000-4000-8000-000000000081';
 category uuid; token text; hash text; event uuid:=gen_random_uuid(); first_result jsonb; duplicate_result jsonb;
begin
 if has_function_privilege('anon','public.manage_wallet(text,text,uuid,uuid)','EXECUTE')
 or has_function_privilege('authenticated','public.receive_wallet_purchase(text,uuid,text,text,bigint,date)','EXECUTE') then raise exception 'FAIL: permissões'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 select id into category from public.categories where user_id=u and kind='expense' limit 1;
 token:=public.manage_wallet('rotate')->>'token';
 hash:=encode(sha256(convert_to(token,'UTF8')),'hex');
 if public.manage_wallet('status') ? 'token' then raise exception 'FAIL: vazamento da chave'; end if;
 begin
  perform public.manage_wallet('save','Outro','30000000-0000-4000-8000-000000000082',category);
  raise exception 'FAIL: cartão alheio';
 exception when check_violation then null; end;
 perform public.manage_wallet('save','Wallet A',card,category);
 first_result:=public.receive_wallet_purchase(hash,event,'Wallet A','Mercado',3590,'2026-01-10');
 duplicate_result:=public.receive_wallet_purchase(hash,event,'Wallet A','Mercado',3590,'2026-01-10');
 if first_result->>'status'<>'created' or duplicate_result->>'status'<>'duplicate'
 or first_result->>'transaction_id'<>duplicate_result->>'transaction_id'
 or (select count(*) from public.transactions where user_id=u and idempotency_key=event)<>1 then raise exception 'FAIL: idempotência'; end if;
 if not exists(select 1 from public.transactions where user_id=u and idempotency_key=event and amount_cents=3590 and status='posted' and account_id is null and settled_on is null and invoice_id is not null and due_date='2026-01-28') then raise exception 'FAIL: crédito'; end if;
 begin
  perform public.receive_wallet_purchase(hash,event,'Wallet A','Mercado',3591,'2026-01-10');
  raise exception 'FAIL: alteração de evento';
 exception when unique_violation then null; end;
 begin
  perform public.receive_wallet_purchase(hash,gen_random_uuid(),'Desconhecido','Mercado',3590,'2026-01-10');
  raise exception 'FAIL: cartão desconhecido';
 exception when check_violation then null; end;
 begin
  perform public.receive_wallet_purchase(hash,gen_random_uuid(),'Wallet A','Mercado',0,'2026-01-10');
  raise exception 'FAIL: valor zero';
 exception when invalid_parameter_value then null; end;
 perform public.manage_wallet('revoke');
 begin
  perform public.receive_wallet_purchase(hash,gen_random_uuid(),'Wallet A','Mercado',3590,'2026-01-10');
  raise exception 'FAIL: chave revogada';
 exception when invalid_authorization_specification then null; end;
 if (select count(*) from private.wallet_events where user_id=u)<>1 then raise exception 'FAIL: escrita parcial'; end if;
end; $$;
rollback;
