begin;
-- Datas geradas a partir da âncora original, nunca da ocorrência anterior.
create function public.generate_recurrences(p_rule uuid,p_until date) returns integer
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); rule public.recurring_transactions%rowtype; n integer:=0; occurrence date; affected integer; generated integer:=0;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_until is null or p_until>(now() at time zone 'America/Sao_Paulo')::date+interval '2 years' then raise exception 'Horizonte máximo: dois anos.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into rule from public.recurring_transactions where user_id=u and id=p_rule and is_active for update;
 if not found then raise exception 'Recorrência indisponível.' using errcode='23514'; end if;
 if rule.payment_method='credit' then raise exception 'Recorrência no crédito exige fatura explícita.' using errcode='23514'; end if;
 perform 1 from public.categories where id=rule.category_id and user_id=u and is_active and kind=rule.kind for share;
 if not found then raise exception 'Categoria indisponível.' using errcode='23514'; end if;
 perform 1 from public.accounts where id=rule.account_id and user_id=u and is_active for share;
 if not found then raise exception 'Conta indisponível.' using errcode='23514'; end if;
 loop
  occurrence:=case rule.interval_unit when 'day' then rule.starts_on+n*rule.interval_count when 'week' then rule.starts_on+n*rule.interval_count*7 when 'month' then (rule.starts_on+make_interval(months=>n*rule.interval_count))::date when 'year' then (rule.starts_on+make_interval(years=>n*rule.interval_count))::date end;
  exit when occurrence>p_until or (rule.ends_on is not null and occurrence>rule.ends_on);
  if n>=10000 then raise exception 'Reduza o período da recorrência.' using errcode='22023'; end if;
  insert into public.transactions(user_id,description,kind,amount_cents,category_id,occurred_on,due_date,payment_method,account_id,status,recurring_transaction_id,recurrence_on,notes)
  values(u,rule.description,rule.kind,rule.amount_cents,rule.category_id,occurrence,occurrence,rule.payment_method,rule.account_id,'pending',rule.id,occurrence,rule.notes)
  on conflict(user_id,recurring_transaction_id,recurrence_on) do nothing;
  get diagnostics affected=row_count;generated:=generated+affected;n:=n+1;
 end loop;
 return generated;
end; $$;
create function public.update_recurrence(p_rule uuid,p_version timestamptz,p_description text,p_amount bigint,p_end date,p_active boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); rule public.recurring_transactions%rowtype;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_description is null or char_length(btrim(p_description)) not between 1 and 200 or p_amount is null or p_amount not between 1 and 9007199254740991 or p_active is null then raise exception 'Dados inválidos.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into rule from public.recurring_transactions where user_id=u and id=p_rule for update;
 if not found then raise exception 'Recorrência indisponível.' using errcode='42501'; end if;
 if rule.updated_at is distinct from p_version then raise exception 'Registro alterado: atualize a página.' using errcode='40001'; end if;
 if p_end<rule.starts_on then raise exception 'Fim anterior ao início.' using errcode='23514'; end if;
 update public.recurring_transactions set description=btrim(p_description),amount_cents=p_amount,ends_on=p_end,is_active=p_active where user_id=u and id=p_rule;
 -- Alteração vale apenas para ocorrências ainda não geradas. Encerramento não apaga débitos existentes.
 return p_rule;
end; $$;
revoke update on public.recurring_transactions from authenticated;
revoke all on function public.generate_recurrences(uuid,date),public.update_recurrence(uuid,timestamptz,text,bigint,date,boolean) from public,anon;
grant execute on function public.generate_recurrences(uuid,date),public.update_recurrence(uuid,timestamptz,text,bigint,date,boolean) to authenticated;
commit;
