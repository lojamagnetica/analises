-- Gamificação, segunda parte: estrelas à parte dos pontos (semana em dia e indique e ganhe dão 20 estrelas),
-- clientes da semana cadastrados completos (+20 pontos) e caixa + relatórios da semana (+20 pontos para quem cuida do caixa).

alter table public.loja_pontos add column if not exists estrelas int not null default 0;
update public.loja_pontos set estrelas = 1 where tipo = 'estrela' and estrelas = 0;
alter table public.loja_pontos drop constraint if exists loja_pontos_tipo_check;
alter table public.loja_pontos add constraint loja_pontos_tipo_check check (tipo in ('missao', 'estrela', 'indicacao', 'semana', 'clientes', 'caixa', 'resgate', 'ajuste'));
alter table public.loja_equipe add column if not exists responsavel_caixa boolean not null default false;
update public.loja_equipe set responsavel_caixa = true where id = 'd68ad048-6c60-4c55-ab20-d03b8d4fd8eb'; -- Sther, caixa da Pitanga Morena

create or replace function public.trg_pontos_missao() returns trigger language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Recife')::date;
begin
  if new.feito and not coalesce(old.feito, false) then
    if hoje = new.dia then
      insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
        values (new.portal_id, new.pessoa_id, new.dia, 'missao', new.pontos, new.id::text, left(new.texto, 80)) on conflict do nothing;
      if not exists (select 1 from loja_missao_dia m where m.pessoa_id = new.pessoa_id and m.dia = new.dia and not m.feito) then
        insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, estrelas, ref, texto)
          values (new.portal_id, new.pessoa_id, new.dia, 'estrela', 0, 1, new.dia::text, 'Todas as missões do dia') on conflict do nothing;
      end if;
    end if;
  elsif not new.feito and coalesce(old.feito, false) then
    delete from loja_pontos where pessoa_id = new.pessoa_id and tipo = 'missao' and ref = new.id::text;
    delete from loja_pontos where pessoa_id = new.pessoa_id and tipo = 'estrela' and ref = new.dia::text;
  end if;
  return new;
end $$;

-- Fecha as semanas terminadas (segunda a domingo, a partir de 09/11/2026).
create or replace function public.pontos_fechar_semanas() returns integer language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Recife')::date; ws date := date '2026-11-09'; r record; n int := 0;
begin
  while ws + 6 < hoje loop
    -- Semana em dia: 80% ou mais dos atendimentos com resultado (mínimo de 5) = +50 pontos e 20 estrelas.
    for r in
      select a.portal_id, a.pessoa_id, count(*) total, count(*) filter (where a.resultado is not null) feitos
      from loja_vez_atend a where a.dia between ws and ws + 6 and a.pessoa_id is not null group by 1, 2
    loop
      if r.total >= 5 and r.feitos * 100 >= 80 * r.total then
        insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, estrelas, ref, texto)
          values (r.portal_id, r.pessoa_id, ws + 6, 'semana', 50, 20, ws::text, 'Semana com a lista da vez em dia') on conflict do nothing;
        n := n + 1;
      end if;
    end loop;
    -- Clientes da semana cadastrados completos (WhatsApp e aniversário): +20 pontos para a vendedora que cadastrou.
    for r in
      select e.portal_id, e.id pessoa_id, count(*) total,
             count(*) filter (where coalesce(c.whatsapp, '') <> '' and c.aniversario is not null) completos
      from loja_equipe e join loja_clientes c on c.portal_id = e.portal_id
        and lower(split_part(coalesce(c.vendedora, ''), ' ', 1)) = lower(split_part(e.nome, ' ', 1))
        and (coalesce(e.loja, '') = '' or c.loja = e.loja)
      where coalesce(e.ativo, true) and (c.created_at at time zone 'America/Recife')::date between ws and ws + 6
      group by 1, 2
    loop
      if r.total > 0 and r.completos = r.total then
        insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
          values (r.portal_id, r.pessoa_id, ws + 6, 'clientes', 20, ws::text, 'Clientes da semana cadastrados completos') on conflict do nothing;
        n := n + 1;
      end if;
    end loop;
    -- Caixa e relatórios: todos os dias de segunda a sábado lançados na loja e a conferência da semana feita = +20 pontos.
    for r in select e.portal_id, e.id pessoa_id, e.loja from loja_equipe e where e.responsavel_caixa and coalesce(e.ativo, true) loop
      if (select count(distinct c.dia) from loja_caixa c where c.portal_id = r.portal_id and (coalesce(r.loja, '') = '' or c.loja = r.loja) and c.dia between ws and ws + 5) = 6
         and exists (select 1 from loja_envios v where v.portal_id = r.portal_id and v.tipo = 'semanal' and v.periodo = ws::text) then
        insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
          values (r.portal_id, r.pessoa_id, ws + 6, 'caixa', 20, ws::text, 'Caixas e relatórios da semana em dia') on conflict do nothing;
        n := n + 1;
      end if;
    end loop;
    ws := ws + 7;
  end loop;
  return n;
end $$;
revoke all on function public.pontos_fechar_semanas() from public, anon, authenticated;

-- Indique e ganhe: +20 pontos e 20 estrelas para quem indicou.
create or replace function public.vez_encerrar(p_token uuid, p_resultado text, p_motivo text, p_cliente text, p_obs text, p_indicou uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date; aberto uuid; ind uuid;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  if p_resultado not in ('vendeu', 'nao_vendeu') then return; end if;
  select id into aberto from public.loja_vez_atend where portal_id = q.portal_id and pessoa_id = q.id and dia = hoje and fim_em is null order by inicio_em desc limit 1;
  if aberto is not null then
    select e.id into ind from loja_equipe e where e.id = p_indicou and e.portal_id = q.portal_id and e.id <> q.id and coalesce(e.ativo, true);
    update public.loja_vez_atend set fim_em = now(), resultado = p_resultado, motivo = left(coalesce(p_motivo, ''), 200), cliente = left(coalesce(p_cliente, ''), 80), obs = left(coalesce(p_obs, ''), 300),
      indicada_por = case when p_resultado = 'vendeu' then ind end where id = aberto;
    if p_resultado = 'vendeu' and ind is not null and hoje between date '2026-11-01' and date '2026-12-31' then
      insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, estrelas, ref, texto)
        values (q.portal_id, ind, hoje, 'indicacao', 20, 20, aberto::text, 'Indicou uma cliente que comprou com ' || split_part(q.nome, ' ', 1)) on conflict do nothing;
    end if;
  end if;
  insert into public.loja_vez_fila (portal_id, loja, dia, pessoa_id, status, ordem_em) values (q.portal_id, q.loja, hoje, q.id, 'fila', now())
    on conflict (portal_id, loja, dia, pessoa_id) do update set status = 'fila', ordem_em = now();
end $$;

-- Estrelas somadas (missões completas = 1, semana em dia e indicação = 20) e histórico com estrelas.
create or replace function public.vez_extras(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date; ws date; tot int; fe int; saldo int; acum int;
begin
  select * into q from public.vez_quem(p_token); if not found then return null; end if;
  ws := hoje - ((extract(isodow from hoje)::int) - 1);
  select count(*), count(*) filter (where resultado is not null) into tot, fe from loja_vez_atend where pessoa_id = q.id and dia between ws and ws + 6;
  select coalesce(sum(pontos), 0), coalesce(sum(pontos) filter (where pontos > 0), 0) into saldo, acum from loja_pontos where pessoa_id = q.id;
  return jsonb_build_object(
    'pontos', jsonb_build_object('saldo', saldo, 'acumulado', acum, 'vouchers', saldo / 500,
      'estrelas', (select coalesce(sum(estrelas), 0) from loja_pontos where pessoa_id = q.id),
      'estrela_hoje', exists (select 1 from loja_pontos where pessoa_id = q.id and tipo = 'estrela' and ref = hoje::text),
      'semana', jsonb_build_object('atend', tot, 'feitos', fe, 'bonus', exists (select 1 from loja_pontos where pessoa_id = q.id and tipo = 'semana' and ref = ws::text)),
      'hist', coalesce((select jsonb_agg(jsonb_build_object('dia', h.dia, 'tipo', h.tipo, 'pontos', h.pontos, 'estrelas', h.estrelas, 'texto', h.texto) order by h.created_at desc)
        from (select * from loja_pontos where pessoa_id = q.id and (pontos <> 0 or estrelas <> 0) order by created_at desc limit 8) h), '[]'::jsonb)),
    'chamar', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'whatsapp', c.whatsapp, 'resumo', c.resumo, 'comprou', c.comprou, 'mensagem', c.mensagem, 'feito', c.chamado_em is not null) order by (c.chamado_em is not null), c.ordem)
      from loja_chamar c where c.pessoa_id = q.id), '[]'::jsonb),
    'colegas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'nome', split_part(e.nome, ' ', 1)) order by e.nome)
      from loja_equipe e where e.portal_id = q.portal_id and coalesce(e.ativo, true) and e.id <> q.id and (coalesce(e.loja, '') in ('', q.loja))), '[]'::jsonb));
end $$;

