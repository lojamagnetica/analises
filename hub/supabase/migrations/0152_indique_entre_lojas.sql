-- Indique e ganhe: só vale a indicação de quem é da outra loja (feminino para masculino e o contrário, inclusive a Sther no caixa).
-- Indique e ganhe: +20 pontos e 20 estrelas para quem indicou.
create or replace function public.vez_encerrar(p_token uuid, p_resultado text, p_motivo text, p_cliente text, p_obs text, p_indicou uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date; aberto uuid; ind uuid;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  if p_resultado not in ('vendeu', 'nao_vendeu') then return; end if;
  select id into aberto from public.loja_vez_atend where portal_id = q.portal_id and pessoa_id = q.id and dia = hoje and fim_em is null order by inicio_em desc limit 1;
  if aberto is not null then
    select e.id into ind from loja_equipe e where e.id = p_indicou and e.portal_id = q.portal_id and coalesce(e.ativo, true)
      and coalesce(e.loja, '') <> '' and coalesce(q.loja, '') <> '' and e.loja <> q.loja;
    update public.loja_vez_atend set fim_em = now(), resultado = p_resultado, motivo = left(coalesce(p_motivo, ''), 200), cliente = left(coalesce(p_cliente, ''), 80), obs = left(coalesce(p_obs, ''), 300),
      indicada_por = case when p_resultado = 'vendeu' then ind end where id = aberto;
    if p_resultado = 'vendeu' and ind is not null and hoje between date '2026-11-01' and date '2026-12-31' then
      insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, estrelas, ref, texto)
        values (q.portal_id, ind, hoje, 'indicacao', 20, 20, aberto::text, 'Indicou uma cliente que comprou na ' || q.loja) on conflict do nothing;
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
      from loja_equipe e where e.portal_id = q.portal_id and coalesce(e.ativo, true) and coalesce(e.loja, '') <> '' and coalesce(q.loja, '') <> '' and e.loja <> q.loja), '[]'::jsonb));
end $$;
