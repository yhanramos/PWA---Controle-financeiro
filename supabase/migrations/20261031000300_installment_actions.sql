begin;
create function public.edit_installment_plan(p_plan uuid,p_version timestamptz,p_description text,p_notes text) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); plan public.installment_plans%rowtype;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_description is null or char_length(btrim(p_description)) not between 1 and 200 or char_length(p_notes)>2000 then raise exception 'Descrição ou observação inválida.' using errcode='22023'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into plan from public.installment_plans where id=p_plan and user_id=u for update;
 if not found then raise exception 'Parcelamento indisponível.' using errcode='42501'; end if;
 if plan.updated_at is distinct from p_version or plan.status<>'active' then raise exception 'Registro alterado: atualize a página.' using errcode='40001'; end if;
 update public.installment_plans set description=btrim(p_description),notes=nullif(btrim(p_notes),'') where id=p_plan and user_id=u;
 return p_plan;
end; $$;
create function public.cancel_installment_plan(p_plan uuid,p_version timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); plan public.installment_plans%rowtype; target uuid;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 perform 1 from public.profiles where id=u for update;
 select * into plan from public.installment_plans where id=p_plan and user_id=u for update;
 if not found then raise exception 'Parcelamento indisponível.' using errcode='42501'; end if;
 if plan.status='cancelled' then return p_plan; end if;
 if plan.updated_at is distinct from p_version then raise exception 'Registro alterado: atualize a página.' using errcode='40001'; end if;
 for target in select distinct invoice_id from public.installments where user_id=u and installment_plan_id=p_plan order by invoice_id loop
  perform 1 from public.credit_card_invoices where user_id=u and id=target for update;
  if exists(select 1 from public.invoice_payments where user_id=u and invoice_id=target and status='confirmed') then raise exception 'Estorne os pagamentos antes de cancelar o parcelamento.' using errcode='23514'; end if;
 end loop;
 update public.installments set status='cancelled' where user_id=u and installment_plan_id=p_plan and status='active';
 update public.installment_plans set status='cancelled' where user_id=u and id=p_plan;
 return p_plan;
end; $$;
create function public.anticipate_installment_plan(p_key uuid,p_plan uuid,p_invoice uuid,p_account uuid,p_discount bigint,p_date date) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); plan public.installment_plans%rowtype; destination public.credit_card_invoices%rowtype;
 prior private.financial_requests%rowtype; payload jsonb; total numeric:=0; remaining bigint; cut bigint; part record; target uuid; payment uuid;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501'; end if;
 if p_key is null or p_discount is null or p_discount<0 or p_date is null or p_date>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'Dados inválidos.' using errcode='22023'; end if;
 payload:=jsonb_build_object('plan',p_plan,'invoice',p_invoice,'account',p_account,'discount',p_discount,'date',p_date);
 perform 1 from public.profiles where id=u for update;
 select * into prior from private.financial_requests where user_id=u and request_id=p_key;
 if found then
  if prior.operation<>'anticipate' or prior.payload<>payload then raise exception 'Chave reutilizada com dados diferentes.' using errcode='23505'; end if;
  return prior.result_id;
 end if;
 if exists(select 1 from public.invoice_payments where user_id=u and idempotency_key=p_key) then raise exception 'Chave de pagamento já utilizada.' using errcode='23505'; end if;
 select * into plan from public.installment_plans where user_id=u and id=p_plan and status='active' for update;
 if not found then raise exception 'Parcelamento indisponível.' using errcode='23514'; end if;
 perform 1 from public.credit_cards where user_id=u and id=plan.credit_card_id and allows_early_settlement is true for share;
 if not found then raise exception 'Antecipação não permitida neste cartão.' using errcode='23514'; end if;
 -- Bloqueia todas as faturas em ordem determinística, igual à guarda dos itens.
 for target in select distinct x from (select invoice_id x from public.installments where user_id=u and installment_plan_id=p_plan and status='active' union select p_invoice) ids order by x loop
  perform 1 from public.credit_card_invoices where user_id=u and id=target for update;
 end loop;
 select * into destination from public.credit_card_invoices where user_id=u and id=p_invoice and credit_card_id=plan.credit_card_id and status='open';
 if not found or exists(select 1 from public.invoice_payments where user_id=u and invoice_id=p_invoice and status='confirmed') then raise exception 'Fatura de destino indisponível.' using errcode='23514'; end if;
 -- Somente parcelas futuras, não antecipadas, em faturas sem pagamentos.
 select coalesce(sum(i.amount_cents),0) into total from public.installments i join public.credit_card_invoices f on f.id=i.invoice_id and f.user_id=i.user_id
 where i.user_id=u and i.installment_plan_id=p_plan and i.status='active' and i.anticipated_on is null and f.status='open' and f.due_date>destination.due_date
 and not exists(select 1 from public.invoice_payments p where p.user_id=u and p.invoice_id=i.invoice_id and p.status='confirmed');
 if total<=0 or total>9007199254740991 or p_discount>total then raise exception 'Desconto ou saldo elegível inválido.' using errcode='23514'; end if;
 remaining:=p_discount;
 for part in select i.* from public.installments i join public.credit_card_invoices f on f.id=i.invoice_id and f.user_id=i.user_id
 where i.user_id=u and i.installment_plan_id=p_plan and i.status='active' and i.anticipated_on is null and f.status='open' and f.due_date>destination.due_date
 and not exists(select 1 from public.invoice_payments p where p.user_id=u and p.invoice_id=i.invoice_id and p.status='confirmed') order by i.installment_number loop
  cut:=least(remaining,part.amount_cents);remaining:=remaining-cut;
  update public.installments set invoice_id=p_invoice,discount_cents=cut,anticipated_on=p_date where id=part.id and user_id=u;
 end loop;
 payment:=p_plan;
 if total>p_discount then payment:=public.pay_invoice(p_key,p_invoice,p_account,(total-p_discount)::bigint,p_date); end if;
 insert into private.financial_requests values(u,p_key,'anticipate',payload,payment);
 return payment;
end; $$;
revoke all on function public.edit_installment_plan(uuid,timestamptz,text,text),public.cancel_installment_plan(uuid,timestamptz),public.anticipate_installment_plan(uuid,uuid,uuid,uuid,bigint,date) from public,anon;
grant execute on function public.edit_installment_plan(uuid,timestamptz,text,text),public.cancel_installment_plan(uuid,timestamptz),public.anticipate_installment_plan(uuid,uuid,uuid,uuid,bigint,date) to authenticated;
commit;
