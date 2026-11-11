-- Estrelas contam para dois destaques do mês: o Destaque da loja (mais estrelas na loja: R$ 200 + 100 pontos no mês seguinte)
-- e o Destaque Absoluto Brasil do Programa Loja Magnética (mais estrelas entre todas as lojas: R$ 200 extra da mentora).

create table if not exists public.destaque_brasil (
  mes        text not null,                      -- AAAA-MM
  pessoa_id  uuid not null references public.loja_equipe (id) on delete cascade,
  portal_id  uuid not null references public.portais (id) on delete cascade,
  estrelas   int not null,
  valor      int not null default 200,
  pago       boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (mes, pessoa_id)
);
alter table public.destaque_brasil enable row level security;
drop policy if exists destaque_brasil_equipe on public.destaque_brasil;
create policy destaque_brasil_equipe on public.destaque_brasil for all using (public.is_equipe()) with check (public.is_equipe());

-- Estrelas de cada pessoa no mês, em todas as lojas do programa, e quando chegou ao total (desempate).
create or replace function public.ranking_estrelas_brasil(p_mes date) returns table (pessoa_id uuid, portal_id uuid, nome text, loja text, estrelas int, chegou_em timestamptz)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.id, p.pessoa_id, p.portal_id, p.estrelas, p.created_at from loja_pontos p
    where p.estrelas > 0 and p.dia >= p_mes and p.dia < (p_mes + interval '1 month')::date
  ), soma as (select b.pessoa_id, b.portal_id, sum(b.estrelas)::int est from base b group by 1, 2),
  acum as (select b.pessoa_id, b.created_at, sum(b.estrelas) over (partition by b.pessoa_id order by b.created_at, b.id) run from base b)
  select s.pessoa_id, s.portal_id, split_part(e.nome, ' ', 1), coalesce(nullif(e.loja, ''), po.loja), s.est,
    (select min(a.created_at) from acum a where a.pessoa_id = s.pessoa_id and a.run >= s.est)
  from soma s join loja_equipe e on e.id = s.pessoa_id join portais po on po.id = s.portal_id
$$;
revoke all on function public.ranking_estrelas_brasil(date) from public, anon, authenticated;

-- Fecha os meses terminados (a partir de novembro/2026): quem somou mais estrelas entre todas as lojas (no máximo 2 em caso de empate, as que chegaram primeiro).
create or replace function public.premiar_destaque_brasil() returns integer language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Recife')::date; m date := date '2026-11-01'; r record; n int := 0;
begin
  while m + interval '1 month' <= hoje loop
    for r in
      with rk as (select * from ranking_estrelas_brasil(m))
      select pessoa_id, portal_id, estrelas from rk where estrelas = (select max(estrelas) from rk) order by chegou_em limit 2
    loop
      insert into destaque_brasil (mes, pessoa_id, portal_id, estrelas) values (to_char(m, 'YYYY-MM'), r.pessoa_id, r.portal_id, r.estrelas) on conflict do nothing;
      n := n + 1;
    end loop;
    m := (m + interval '1 month')::date;
  end loop;
  return n;
end $$;
revoke all on function public.premiar_destaque_brasil() from public, anon, authenticated;
select cron.schedule('pontos-semanas', '10 9 * * *', 'select public.pontos_fechar_semanas(); select public.pontos_destaque_mes(); select public.premiar_lojas_mentoria(); select public.premiar_destaque_brasil();');

-- Para a equipe da mentora (logada): o ranking de estrelas do Brasil no mês.
create or replace function public.ranking_estrelas_equipe(p_mes date) returns table (pessoa_id uuid, portal_id uuid, nome text, loja text, estrelas int, chegou_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_equipe() then raise exception 'só a equipe'; end if;
  return query select * from ranking_estrelas_brasil(p_mes) r order by r.estrelas desc, r.chegou_em limit 10;
end $$;
revoke execute on function public.ranking_estrelas_equipe(date) from public, anon;
grant execute on function public.ranking_estrelas_equipe(date) to authenticated;
