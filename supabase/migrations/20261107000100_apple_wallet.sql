begin;

create table private.wallet_credentials (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 token_hash text not null unique,
 created_at timestamptz not null default now()
);
create table private.wallet_cards (
 user_id uuid not null references public.profiles(id) on delete cascade,
 alias text not null check (char_length(alias) between 1 and 200),
 card_id uuid not null references public.credit_cards(id),
 category_id uuid not null references public.categories(id),
 primary key(user_id,alias)
);
create table private.wallet_events (
 user_id uuid not null references public.profiles(id) on delete cascade,
 event_id uuid not null,
 payload_hash text not null,
 transaction_id uuid not null references public.transactions(id),
 created_at timestamptz not null default now(),
 primary key(user_id,event_id)
);
create index wallet_events_recent on private.wallet_events(user_id,created_at);
alter table private.wallet_credentials enable row level security;
alter table private.wallet_cards enable row level security;
alter table private.wallet_events enable row level security;
revoke all on private.wallet_credentials,private.wallet_cards,private.wallet_events from public,anon,authenticated;

-- Only a signed-in owner can configure the integration. The raw key is returned once.
create function public.manage_wallet(p_action text,p_alias text default null,p_card uuid default null,p_category uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); secret text; result jsonb;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 perform 1 from public.profiles where id=u for update;
 if not found then raise exception 'Perfil indisponível.' using errcode='42501'; end if;
 if p_action='rotate' then
  secret:='wallet_'||replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into private.wallet_credentials(user_id,token_hash) values(u,encode(sha256(convert_to(secret,'UTF8')),'hex'))
  on conflict(user_id) do update set token_hash=excluded.token_hash,created_at=now();
 elsif p_action='revoke' then
  delete from private.wallet_credentials where user_id=u;
 elsif p_action='save' then
  if p_alias is null or char_length(btrim(p_alias)) not between 1 and 200 then raise exception 'Nome inválido.' using errcode='22023'; end if;
  perform 1 from public.credit_cards where id=p_card and user_id=u and is_active for share;
  if not found then raise exception 'Cartão indisponível.' using errcode='23514'; end if;
  perform 1 from public.categories where id=p_category and user_id=u and kind='expense' and is_active for share;
  if not found then raise exception 'Categoria indisponível.' using errcode='23514'; end if;
  insert into private.wallet_cards values(u,lower(btrim(p_alias)),p_card,p_category)
  on conflict(user_id,alias) do update set card_id=excluded.card_id,category_id=excluded.category_id;
 elsif p_action='remove' then
  delete from private.wallet_cards where user_id=u and alias=lower(btrim(p_alias));
 elsif p_action is distinct from 'status' then
  raise exception 'Ação inválida.' using errcode='22023';
 end if;
 select jsonb_build_object(
  'enabled',exists(select 1 from private.wallet_credentials where user_id=u),
  'mappings',coalesce((select jsonb_agg(jsonb_build_object('alias',w.alias,'card_id',w.card_id,'category_id',w.category_id)) from private.wallet_cards w where w.user_id=u),'[]'::jsonb),
  'cards',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.credit_cards where user_id=u and is_active),'[]'::jsonb),
  'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from public.categories where user_id=u and is_active and kind='expense'),'[]'::jsonb),
  'last_received_at',(select max(created_at) from private.wallet_events where user_id=u)
 ) into result;
 if secret is not null then result:=result||jsonb_build_object('token',secret); end if;
 return result;
end; $$;
revoke all on function public.manage_wallet(text,text,uuid,uuid) from public,anon;
grant execute on function public.manage_wallet(text,text,uuid,uuid) to authenticated;

-- A credential authorizes only credit purchases through an explicit owner-scoped mapping.
create function public.receive_wallet_purchase(p_hash text,p_event uuid,p_alias text,p_merchant text,p_amount bigint,p_date date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; mapping private.wallet_cards%rowtype; prior private.wallet_events%rowtype;
 fingerprint text; invoice uuid; due_on date; result uuid;
begin
 select user_id into u from private.wallet_credentials where token_hash=p_hash;
 if u is null then raise exception 'Chave inválida ou revogada.' using errcode='28000'; end if;
 perform 1 from public.profiles where id=u for update;
 -- Serialize with rotation/revocation and recheck after acquiring the owner's lock.
 perform 1 from private.wallet_credentials where user_id=u and token_hash=p_hash;
 if not found then raise exception 'Chave inválida ou revogada.' using errcode='28000'; end if;
 if p_event is null or p_amount is null or p_amount not between 1 and 9007199254740991
 or p_alias is null or char_length(btrim(p_alias)) not between 1 and 200
 or p_merchant is null or char_length(btrim(p_merchant)) not between 1 and 180
 or p_date is null or p_date<'1900-01-01' or p_date>(now() at time zone 'America/Sao_Paulo')::date then
  raise exception 'Compra inválida.' using errcode='22023';
 end if;
 fingerprint:=encode(sha256(convert_to(jsonb_build_array(lower(btrim(p_alias)),btrim(p_merchant),p_amount,p_date)::text,'UTF8')),'hex');
 select * into prior from private.wallet_events where user_id=u and event_id=p_event;
 if found then
  if prior.payload_hash<>fingerprint then raise exception 'Evento reutilizado com dados diferentes.' using errcode='23505'; end if;
  return jsonb_build_object('status','duplicate','transaction_id',prior.transaction_id);
 end if;
 if (select count(*) from private.wallet_events where user_id=u and created_at>now()-interval '1 day')>=100 then
  raise exception 'Limite diário atingido.' using errcode='54000';
 end if;
 select * into mapping from private.wallet_cards where user_id=u and alias=lower(btrim(p_alias));
 if not found then raise exception 'Associe este cartão nas configurações.' using errcode='23514'; end if;
 perform 1 from public.categories where id=mapping.category_id and user_id=u and is_active and kind='expense' for share;
 if not found then raise exception 'Categoria indisponível.' using errcode='23514'; end if;
 invoice:=private.credit_invoice(u,mapping.card_id,p_date);
 select due_date into due_on from public.credit_card_invoices where id=invoice and user_id=u;
 insert into public.transactions(user_id,idempotency_key,description,kind,amount_cents,category_id,occurred_on,due_date,payment_method,credit_card_id,invoice_id,status)
 values(u,p_event,btrim(p_merchant),'expense',p_amount,mapping.category_id,p_date,due_on,'credit',mapping.card_id,invoice,'posted') returning id into result;
 insert into private.wallet_events(user_id,event_id,payload_hash,transaction_id) values(u,p_event,fingerprint,result);
 return jsonb_build_object('status','created','transaction_id',result);
end; $$;
revoke all on function public.receive_wallet_purchase(text,uuid,text,text,bigint,date) from public,anon,authenticated;
grant execute on function public.receive_wallet_purchase(text,uuid,text,text,bigint,date) to service_role;
commit;
