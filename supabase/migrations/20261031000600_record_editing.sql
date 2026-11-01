begin;
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
commit;
