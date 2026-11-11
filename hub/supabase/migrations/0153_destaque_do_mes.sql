-- Destaque do mês: quem somar mais estrelas no mês ganha o prêmio e começa o mês seguinte com 100 pontos.
-- Thamy cuida do caixa da Pitanga For Men (ganha os pontos de caixa e relatórios da semana).

update public.loja_equipe set responsavel_caixa = true where id = 'fd2d1dfe-eaed-4ef7-a3e0-36f4a0458d15';
alter table public.loja_pontos drop constraint if exists loja_pontos_tipo_check;
alter table public.loja_pontos add constraint loja_pontos_tipo_check check (tipo in ('missao', 'estrela', 'indicacao', 'semana', 'clientes', 'caixa', 'destaque', 'resgate', 'ajuste'));

-- Fecha os meses terminados (a partir de novembro/2026): empate leva todo mundo. Os 100 pontos entram no dia 1 do mês seguinte.
create or replace function public.pontos_destaque_mes() returns integer language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Recife')::date; m date := date '2026-11-01'; r record; n int := 0;
begin
  while m + interval '1 month' <= hoje loop
    for r in
      with soma as (
        select portal_id, pessoa_id, sum(estrelas) est from loja_pontos where dia >= m and dia < (m + interval '1 month')::date and estrelas > 0 group by 1, 2
      )
      select s.portal_id, s.pessoa_id, s.est from soma s where s.est = (select max(est) from soma x where x.portal_id = s.portal_id)
    loop
      insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
        values (r.portal_id, r.pessoa_id, (m + interval '1 month')::date, 'destaque', 100, to_char(m, 'YYYY-MM'), 'Destaque de ' || to_char(m, 'MM/YYYY') || ' (' || r.est || ' estrelas)') on conflict do nothing;
      n := n + 1;
    end loop;
    m := (m + interval '1 month')::date;
  end loop;
  return n;
end $$;
revoke all on function public.pontos_destaque_mes() from public, anon, authenticated;

select cron.schedule('pontos-semanas', '10 9 * * *', 'select public.pontos_fechar_semanas(); select public.pontos_destaque_mes();');

-- O card de pontos passa a trazer a corrida do destaque do mês (estrelas do mês, posição e líder).
create or replace function public.vez_extras(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date; ws date; mi date; tot int; fe int; saldo int; acum int; mes jsonb;
begin
  select * into q from public.vez_quem(p_token); if not found then return null; end if;
  ws := hoje - ((extract(isodow from hoje)::int) - 1);
  mi := date_trunc('month', hoje)::date;
  select count(*), count(*) filter (where resultado is not null) into tot, fe from loja_vez_atend where pessoa_id = q.id and dia between ws and ws + 6;
  select coalesce(sum(pontos), 0), coalesce(sum(pontos) filter (where pontos > 0), 0) into saldo, acum from loja_pontos where pessoa_id = q.id;
  with r as (
    select e.id, split_part(e.nome, ' ', 1) nome, coalesce(sum(p.estrelas) filter (where p.dia >= mi), 0)::int est
    from loja_equipe e left join loja_pontos p on p.pessoa_id = e.id
    where e.portal_id = q.portal_id and coalesce(e.ativo, true) and coalesce(e.loja, '') <> '' group by e.id, e.nome)
  select jsonb_build_object('estrelas', coalesce((select est from r where id = q.id), 0),
      'posicao', (select count(*) + 1 from r where est > coalesce((select est from r where id = q.id), 0)),
      'lider', (select nome from r order by est desc, nome limit 1), 'lider_estrelas', coalesce((select max(est) from r), 0),
      'mes', to_char(hoje, 'MM/YYYY')) into mes;
  return jsonb_build_object(
    'pontos', jsonb_build_object('saldo', saldo, 'acumulado', acum, 'vouchers', saldo / 500,
      'estrelas', (select coalesce(sum(estrelas), 0) from loja_pontos where pessoa_id = q.id),
      'estrela_hoje', exists (select 1 from loja_pontos where pessoa_id = q.id and tipo = 'estrela' and ref = hoje::text),
      'semana', jsonb_build_object('atend', tot, 'feitos', fe, 'bonus', exists (select 1 from loja_pontos where pessoa_id = q.id and tipo = 'semana' and ref = ws::text)),
      'destaque', mes,
      'hist', coalesce((select jsonb_agg(jsonb_build_object('dia', h.dia, 'tipo', h.tipo, 'pontos', h.pontos, 'estrelas', h.estrelas, 'texto', h.texto) order by h.created_at desc)
        from (select * from loja_pontos where pessoa_id = q.id and (pontos <> 0 or estrelas <> 0) order by created_at desc limit 8) h), '[]'::jsonb)),
    'chamar', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'whatsapp', c.whatsapp, 'resumo', c.resumo, 'comprou', c.comprou, 'mensagem', c.mensagem, 'feito', c.chamado_em is not null) order by (c.chamado_em is not null), c.ordem)
      from loja_chamar c where c.pessoa_id = q.id), '[]'::jsonb),
    'colegas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'nome', split_part(e.nome, ' ', 1)) order by e.nome)
      from loja_equipe e where e.portal_id = q.portal_id and coalesce(e.ativo, true) and coalesce(e.loja, '') <> '' and coalesce(q.loja, '') <> '' and e.loja <> q.loja), '[]'::jsonb));
end $$;
