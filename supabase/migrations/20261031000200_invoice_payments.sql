-- Faturas: pagamentos serializados, sem duplicar despesas.
begin;
create function private.invoice_outstanding(p_user uuid,p_invoice uuid) returns numeric
language sql stable set search_path='' as $$
 select coalesce((select sum(amount_cents) from public.transactions where user_id=p_user and invoice_id=p_invoice and status='posted'),0)
 + coalesce((select sum(i.amount_cents-i.discount_cents) from public.installments i join public.installment_plans p on p.id=i.installment_plan_id and p.user_id=i.user_id where i.user_id=p_user and i.invoice_id=p_invoice and i.status='active' and p.status='active'),0)
 - coalesce((select sum(amount_cents) from public.invoice_payments where user_id=p_user and invoice_id=p_invoice and status='confirmed'),0);
$$;
revoke all on function private.invoice_outstanding(uuid,uuid) from public,anon,authenticated;

create function public.pay_invoice(p_key uuid,p_invoice uuid,p_account uuid,p_amount bigint,p_date date) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); existing public.invoice_payments%rowtype; inv public.credit_card_invoices%rowtype; payment_id uuid;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_key is null or p_amount is null or p_amount<=0 or p_amount>9007199254740991 or p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Pagamento inválido.' using errcode='22023'; end if;
 -- Same user serialization also covers concurrent retries targeting different invoices.
 perform 1 from public.profiles where id=u for update;
 select * into existing from public.invoice_payments where user_id=u and idempotency_key=p_key;
 if found then
  if row(existing.invoice_id,existing.account_id,existing.amount_cents,existing.paid_on) is distinct from row(p_invoice,p_account,p_amount,p_date) then raise exception 'Chave reutilizada com dados diferentes.' using errcode='23505'; end if;
  return existing.id;
 end if;
 select * into inv from public.credit_card_invoices where user_id=u and id=p_invoice for update;
 if not found or inv.status='cancelled' then raise exception 'Fatura indisponível.' using errcode='23514'; end if;
 perform 1 from public.accounts where user_id=u and id=p_account and is_active and opening_balance_date<=p_date for share;
 if not found then raise exception 'Conta ou data incompatível.' using errcode='23514'; end if;
 if p_amount>private.invoice_outstanding(u,p_invoice) then raise exception 'Pagamento excede o saldo da fatura.' using errcode='23514'; end if;
 insert into public.invoice_payments(user_id,idempotency_key,invoice_id,account_id,amount_cents,paid_on) values(u,p_key,p_invoice,p_account,p_amount,p_date) returning id into payment_id;
 return payment_id;
end; $$;

create function public.reverse_invoice_payment(p_payment uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); payment public.invoice_payments%rowtype;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then raise exception 'Informe o motivo do estorno.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into payment from public.invoice_payments where user_id=u and id=p_payment;
 if not found then raise exception 'Pagamento inexistente.' using errcode='42501'; end if;
 perform 1 from public.credit_card_invoices where user_id=u and id=payment.invoice_id for update;
 if payment.status='reversed' then return payment.id; end if;
 update public.invoice_payments set status='reversed',reversed_at=now(),reversal_reason=btrim(p_reason) where id=p_payment and user_id=u;
 return p_payment;
end; $$;

-- Todos os itens disputam a mesma trava da fatura. Após pagamento, corrigir exige estorno.
create function private.guard_invoice_items() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid; owner_id uuid;
begin
 owner_id:=new.user_id;
 for target in select distinct x from unnest(case when tg_op='UPDATE' then array[old.invoice_id,new.invoice_id] else array[new.invoice_id] end) x where x is not null order by x loop
  perform 1 from public.credit_card_invoices where user_id=owner_id and id=target and status='open' for update;
  if not found then raise exception 'A fatura precisa estar aberta.' using errcode='23514'; end if;
  if exists(select 1 from public.invoice_payments where user_id=owner_id and invoice_id=target and status='confirmed') then raise exception 'Estorne os pagamentos antes de alterar os itens.' using errcode='23514'; end if;
 end loop;
 return new;
end; $$;
create trigger guard_invoice_items before insert or update on public.transactions for each row execute function private.guard_invoice_items();
create trigger guard_invoice_items before insert or update on public.installments for each row execute function private.guard_invoice_items();
-- Plan cancellation must be orchestrated with its installments in the next migration.
revoke update on public.installment_plans from authenticated;
revoke insert,update on public.invoice_payments from authenticated;
revoke update on public.credit_card_invoices from authenticated;
revoke all on function private.guard_invoice_items() from public,anon,authenticated;
revoke all on function public.pay_invoice(uuid,uuid,uuid,bigint,date) from public,anon;
revoke all on function public.reverse_invoice_payment(uuid,text) from public,anon;
grant execute on function public.pay_invoice(uuid,uuid,uuid,bigint,date) to authenticated;
grant execute on function public.reverse_invoice_payment(uuid,text) to authenticated;
commit;
