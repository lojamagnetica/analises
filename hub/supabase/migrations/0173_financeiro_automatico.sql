-- Financeiro sem lançamento à mão para o que o Hub já sabe:
-- 1. Venda registrada no Comercial (passagens) vira entrada no Financeiro, pelo valor total, no mês do pagamento.
--    Entra pelo valor total, já como recebida (ajuste no fim do arquivo).
--    Corrigir a venda atualiza a entrada; excluir a venda tira a entrada, se ela ainda não foi conferida.
-- 2. As despesas fixas do mês entram sozinhas no dia 1º (a mesma regra do botão "Lançar as fixas do mês").
set lock_timeout = '8s';

alter table public.fin_lancamentos add column if not exists venda_portal uuid unique references public.portais (id) on delete set null;

create or replace function public.venda_no_financeiro() returns trigger
language plpgsql security definer set search_path = public as $$
declare d text; m text;
begin
  if tg_op = 'DELETE' then
    delete from public.fin_lancamentos where venda_portal = old.portal_id and not pago;
    return null;
  end if;
  select coalesce(nullif(split_part(trim(coalesce(p.responsavel, '')), ' ', 1), ''), p.loja) || ' · ' || p.loja
         || coalesce(' (' || (select pl.nome from public.planos pl where pl.id = new.plano_id) || ')', '')
    into d from public.portais p where p.id = new.portal_id;
  m := to_char(coalesce(new.pagamento_em, (new.created_at at time zone 'America/Recife')::date), 'YYYY-MM');
  insert into public.fin_lancamentos (mes, tipo, natureza, descricao, categoria, valor, bruto, pagador, parcela, pago, obs, venda_portal)
  values (m, 'entrada', 'variavel', left(coalesce(d, 'Venda'), 200), 'Venda', coalesce(new.valor, 0), coalesce(new.valor, 0), 'Empresa', '', false,
          'Do Comercial' || coalesce(' (' || new.vendido_por || ')', '') || ': confirme o valor líquido que caiu na conta e marque como pago.', new.portal_id)
  on conflict (venda_portal) do update set
    mes = excluded.mes, descricao = excluded.descricao, bruto = excluded.bruto,
    valor = case when public.fin_lancamentos.pago then public.fin_lancamentos.valor else excluded.valor end;
  return null;
end $$;
revoke all on function public.venda_no_financeiro() from public, anon, authenticated;
create or replace trigger venda_no_financeiro after insert or update of valor, pagamento_em, plano_id or delete on public.passagens
  for each row execute function public.venda_no_financeiro();

-- Despesas fixas do mês (mesma regra de parcelaNoMes em lib/financeiro.ts).
create or replace function public.lancar_fixas(p_mes text default to_char((now() at time zone 'America/Recife')::date, 'YYYY-MM')) returns integer
language plpgsql security definer set search_path = public as $$
declare f record; n int; parc text; feitas int := 0;
begin
  for f in select * from public.fin_fixas where ativo loop
    continue when exists (select 1 from public.fin_lancamentos l where l.mes = p_mes and l.fixa_id = f.id);
    n := (split_part(p_mes, '-', 1)::int - split_part(coalesce(nullif(f.inicio, ''), p_mes), '-', 1)::int) * 12
       + (split_part(p_mes, '-', 2)::int - split_part(coalesce(nullif(f.inicio, ''), p_mes), '-', 2)::int);
    continue when n < 0;
    if f.parcelas is not null and f.parcelas > 0 then
      continue when n >= f.parcelas;
      parc := (n + 1) || '/' || f.parcelas;
    else
      continue when f.recorrencia = 'Trimestral' and n % 3 <> 0;
      continue when f.recorrencia = 'Anual' and n % 12 <> 0;
      parc := f.recorrencia;
    end if;
    insert into public.fin_lancamentos (mes, tipo, natureza, descricao, categoria, valor, pagador, parcela, dia, pago, fixa_id, obs)
    values (p_mes, 'saida', 'fixa', f.nome, f.categoria, f.valor, f.pagador, parc, f.dia, false, f.id, coalesce(f.obs, ''));
    feitas := feitas + 1;
  end loop;
  return feitas;
end $$;
revoke all on function public.lancar_fixas(text) from public, anon, authenticated;
select cron.schedule('financeiro-fixas', '7 6 1 * *', $$select public.lancar_fixas()$$);

-- Ajuste (Camilla, 13/11): a venda entra pelo valor total, já como recebida, sem "confirmar o líquido".
create or replace function public.venda_no_financeiro() returns trigger
language plpgsql security definer set search_path = public as $$
declare d text; m text;
begin
  if tg_op = 'DELETE' then
    delete from public.fin_lancamentos where venda_portal = old.portal_id;
    return null;
  end if;
  select coalesce(nullif(split_part(trim(coalesce(p.responsavel, '')), ' ', 1), ''), p.loja) || ' · ' || p.loja
         || coalesce(' (' || (select pl.nome from public.planos pl where pl.id = new.plano_id) || ')', '')
    into d from public.portais p where p.id = new.portal_id;
  m := to_char(coalesce(new.pagamento_em, (new.created_at at time zone 'America/Recife')::date), 'YYYY-MM');
  insert into public.fin_lancamentos (mes, tipo, natureza, descricao, categoria, valor, bruto, pagador, parcela, pago, obs, venda_portal)
  values (m, 'entrada', 'variavel', left(coalesce(d, 'Venda'), 200), 'Venda', coalesce(new.valor, 0), coalesce(new.valor, 0), 'Empresa', '', true,
          'Do Comercial' || coalesce(' (' || new.vendido_por || ')', ''), new.portal_id)
  on conflict (venda_portal) do update set mes = excluded.mes, descricao = excluded.descricao, bruto = excluded.bruto, valor = excluded.valor;
  return null;
end $$;
