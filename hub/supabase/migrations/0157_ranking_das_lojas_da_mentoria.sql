-- Ranking das lojas da mentoria: a loja com mais pontos no mês (soma dos pontos individuais) ganha R$ 200 extra da mentora,
-- se bateu a meta do mês. Empate entre 2: as duas ganham. Mais de 2 empatadas: as 2 que chegaram primeiro àquela pontuação.

create table if not exists public.gamificacao_mentoria (
  id             boolean primary key default true check (id),
  meta_minima_pct int not null default 100 check (meta_minima_pct between 0 and 200),
  premio         int not null default 200
);
insert into public.gamificacao_mentoria (id) values (true) on conflict do nothing;
alter table public.gamificacao_mentoria enable row level security;
drop policy if exists gamificacao_mentoria_equipe on public.gamificacao_mentoria;
create policy gamificacao_mentoria_equipe on public.gamificacao_mentoria for all using (public.is_equipe()) with check (public.is_equipe());

create table if not exists public.loja_premio_mentora (
  mes        text not null,
  portal_id  uuid not null references public.portais (id) on delete cascade,
  pontos     int not null,
  valor      int not null default 200,
  pago       boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (mes, portal_id)
);
alter table public.loja_premio_mentora enable row level security;
drop policy if exists loja_premio_mentora_equipe on public.loja_premio_mentora;
create policy loja_premio_mentora_equipe on public.loja_premio_mentora for all using (public.is_equipe()) with check (public.is_equipe());

-- Meta do mês do portal inteiro (soma das metas dos canais; sem canais, o mesmo mês do ano anterior +20%).
create or replace function public.portal_meta_mes(p_portal uuid, p_mes date) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif((select sum((f->'faixas'->0->>'valor')::numeric) from loja_plano_mes pm, jsonb_array_elements(coalesce(pm.dados->'canais', '[]'::jsonb)) f
            where pm.portal_id = p_portal and pm.mes = to_char(p_mes, 'YYYY-MM')), 0),
    (select case when (pm.dados->>'base') is not null then round((pm.dados->>'base')::numeric * (1 + coalesce((pm.dados->>'crescimento')::numeric, 20) / 100) / 100) * 100 end
       from loja_plano_mes pm where pm.portal_id = p_portal and pm.mes = to_char(p_mes, 'YYYY-MM')))
$$;
revoke all on function public.portal_meta_mes(uuid, date) from public, anon, authenticated;

-- Pontos dados no mês por loja, quando chegou à pontuação final (desempate), a meta, o realizado e se pode concorrer.
create or replace function public.ranking_lojas_mes(p_mes date) returns table (portal_id uuid, loja text, pontos int, chegou_em timestamptz, meta numeric, realizado numeric, elegivel boolean)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.id, p.portal_id, p.pontos, p.created_at from loja_pontos p
    where p.pontos > 0 and p.tipo <> 'destaque' and p.dia >= p_mes and p.dia < (p_mes + interval '1 month')::date
  ), soma as (select b.portal_id, sum(b.pontos)::int pts from base b group by 1),
  acum as (select b.portal_id, b.created_at, sum(b.pontos) over (partition by b.portal_id order by b.created_at, b.id) run from base b),
  cfg as (select meta_minima_pct from gamificacao_mentoria limit 1)
  select s.portal_id, po.loja, s.pts,
    (select min(a.created_at) from acum a where a.portal_id = s.portal_id and a.run >= s.pts),
    portal_meta_mes(s.portal_id, p_mes),
    (select coalesce(sum(c.faturamento), 0) from loja_caixa c where c.portal_id = s.portal_id and c.dia >= p_mes and c.dia < (p_mes + interval '1 month')::date),
    coalesce(portal_meta_mes(s.portal_id, p_mes) > 0 and
      (select coalesce(sum(c.faturamento), 0) from loja_caixa c where c.portal_id = s.portal_id and c.dia >= p_mes and c.dia < (p_mes + interval '1 month')::date)
        >= portal_meta_mes(s.portal_id, p_mes) * (select meta_minima_pct from cfg) / 100.0, false)
  from soma s join portais po on po.id = s.portal_id where s.pts > 0
$$;
revoke all on function public.ranking_lojas_mes(date) from public, anon, authenticated;

-- Fecha os meses terminados (a partir de novembro/2026): entre as lojas que bateram a meta, vencem as de maior pontuação (no máximo 2, as que chegaram primeiro).
create or replace function public.premiar_lojas_mentoria() returns integer language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Recife')::date; m date := date '2026-11-01'; r record; n int := 0; valor int;
begin
  select premio into valor from gamificacao_mentoria limit 1;
  while m + interval '1 month' <= hoje loop
    for r in
      with rk as (select * from ranking_lojas_mes(m) where elegivel)
      select portal_id, pontos from rk where pontos = (select max(pontos) from rk) order by chegou_em limit 2
    loop
      insert into loja_premio_mentora (mes, portal_id, pontos, valor) values (to_char(m, 'YYYY-MM'), r.portal_id, r.pontos, coalesce(valor, 200)) on conflict do nothing;
      n := n + 1;
    end loop;
    m := (m + interval '1 month')::date;
  end loop;
  return n;
end $$;
revoke all on function public.premiar_lojas_mentoria() from public, anon, authenticated;
select cron.schedule('pontos-semanas', '10 9 * * *', 'select public.pontos_fechar_semanas(); select public.pontos_destaque_mes(); select public.premiar_lojas_mentoria();');

-- Para a equipe do portal: a posição da loja dela no mês e quanto da meta já foi feito, sem mostrar nome nem número de outras lojas.
create or replace function public.vez_ranking_lojas(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q record; mi date := date_trunc('month', (now() at time zone 'America/Recife')::date)::date; r record; pos int; n int; pct int; meta numeric; real numeric;
begin
  select * into q from public.vez_quem(p_token); if not found then return null; end if;
  select count(*) into n from ranking_lojas_mes(mi);
  select * into r from ranking_lojas_mes(mi) where portal_id = q.portal_id;
  select count(*) + 1 into pos from ranking_lojas_mes(mi) where pontos > coalesce(r.pontos, 0);
  select meta_minima_pct into pct from gamificacao_mentoria limit 1;
  meta := portal_meta_mes(q.portal_id, mi);
  select coalesce(sum(faturamento), 0) into real from loja_caixa where portal_id = q.portal_id and dia >= mi and dia < (mi + interval '1 month')::date;
  return jsonb_build_object('posicao', pos, 'pontos', coalesce(r.pontos, 0), 'lojas', greatest(n, 1),
    'elegivel', coalesce(meta, 0) > 0 and real >= meta * pct / 100.0,
    'meta_pct', case when coalesce(meta, 0) > 0 then round(real / meta * 100) else null end, 'minimo_pct', pct,
    'lider', (select coalesce(max(pontos), 0) from ranking_lojas_mes(mi)));
end $$;
revoke execute on function public.vez_ranking_lojas(uuid) from public;
grant execute on function public.vez_ranking_lojas(uuid) to anon, authenticated;

-- Para a equipe da mentora (logada): o ranking completo do mês.
create or replace function public.ranking_lojas_equipe(p_mes date) returns table (portal_id uuid, loja text, pontos int, chegou_em timestamptz, meta numeric, realizado numeric, elegivel boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_equipe() then raise exception 'só a equipe'; end if;
  return query select * from ranking_lojas_mes(p_mes) r order by r.pontos desc, r.chegou_em;
end $$;
revoke execute on function public.ranking_lojas_equipe(date) from public, anon;
grant execute on function public.ranking_lojas_equipe(date) to authenticated;
