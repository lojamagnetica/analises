-- Lista da vez: observação livre em cada atendimento (o que a cliente queria e não levou) e vários motivos.
alter table public.loja_vez_atend add column if not exists obs text not null default '';

create or replace function public.vez_painel(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q record; hoje date; inicio date; plano jsonb; canal text; meta numeric; mural jsonb;
begin
  select * into q from public.vez_quem(p_token);
  if not found then return null; end if;
  hoje := (now() at time zone 'America/Recife')::date;
  inicio := date_trunc('month', hoje)::date;
  select dados into plano from public.loja_plano_mes where portal_id = q.portal_id and mes = to_char(hoje, 'YYYY-MM');
  canal := coalesce(nullif(q.loja, ''), 'Loja');
  meta := coalesce(
    nullif((select (f->'faixas'->0->>'valor')::numeric from jsonb_array_elements(coalesce(plano->'canais', '[]'::jsonb)) f where f->>'canal' = canal limit 1), 0),
    case when (plano->>'base') is not null then round((plano->>'base')::numeric * (1 + coalesce((plano->>'crescimento')::numeric, 20) / 100) / 100) * 100 end);
  select dados into mural from public.loja_mural where portal_id = q.portal_id and loja in ('', q.loja) order by (loja = '') desc limit 1;
  return jsonb_build_object(
    'pessoa', jsonb_build_object('id', q.id, 'nome', split_part(q.nome, ' ', 1), 'loja', q.loja),
    'hoje', hoje,
    'fila', coalesce((select jsonb_agg(jsonb_build_object('pessoa_id', f.pessoa_id, 'nome', split_part(e.nome, ' ', 1), 'status', f.status, 'chegou_em', f.chegou_em, 'ordem_em', f.ordem_em) order by f.ordem_em)
      from public.loja_vez_fila f join public.loja_equipe e on e.id = f.pessoa_id where f.portal_id = q.portal_id and f.loja = q.loja and f.dia = hoje), '[]'::jsonb),
    'atend', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'pessoa_id', a.pessoa_id, 'nome', split_part(a.nome, ' ', 1), 'inicio_em', a.inicio_em, 'fim_em', a.fim_em, 'resultado', a.resultado, 'motivo', a.motivo, 'cliente', a.cliente, 'obs', a.obs) order by a.inicio_em)
      from public.loja_vez_atend a where a.portal_id = q.portal_id and a.loja = q.loja and a.dia = hoje), '[]'::jsonb),
    'missoes', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'texto', m.texto, 'feito', m.feito) order by m.created_at)
      from public.loja_missao_dia m where m.portal_id = q.portal_id and m.pessoa_id = q.id and m.dia = hoje), '[]'::jsonb),
    'mes', (select jsonb_build_object('faturamento', coalesce(sum((v->>'faturamento')::numeric), 0), 'vendas', coalesce(sum((v->>'vendas')::numeric), 0), 'pecas', coalesce(sum((v->>'pecas')::numeric), 0), 'ate', max(c.dia))
      from public.loja_caixa c, jsonb_array_elements(coalesce(c.vendedoras, '[]'::jsonb)) v
      where c.portal_id = q.portal_id and c.dia >= inicio and c.dia <= hoje and (v->>'pessoa_id') = q.id::text),
    'plano', jsonb_build_object('meta_loja', meta, 'ajustes', coalesce(plano->'metas', '{}'::jsonb),
      'vendedoras', coalesce((select jsonb_agg(e.id) from public.loja_equipe e where e.portal_id = q.portal_id and coalesce(e.ativo, true) and (coalesce(e.loja, '') = q.loja or coalesce(e.loja, '') = '') and e.funcao ~* 'vend|consult|atend'), '[]'::jsonb)),
    'mural', jsonb_build_object('pa', coalesce((mural->>'pa')::numeric, 2.5), 'tkm', (mural->>'tkm')::numeric)
  );
end $$;


-- Termina o atendimento: vendeu ou não vendeu, os motivos (um ou mais, separados por ponto e vírgula),
-- a observação livre (ex.: "queria casaco P de lã") e volta para o final da lista.
create or replace function public.vez_encerrar(p_token uuid, p_resultado text, p_motivo text, p_cliente text, p_obs text) returns void
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date; aberto uuid;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  if p_resultado not in ('vendeu', 'nao_vendeu') then return; end if;
  select id into aberto from public.loja_vez_atend where portal_id = q.portal_id and pessoa_id = q.id and dia = hoje and fim_em is null order by inicio_em desc limit 1;
  if aberto is not null then
    update public.loja_vez_atend set fim_em = now(), resultado = p_resultado, motivo = left(coalesce(p_motivo, ''), 200), cliente = left(coalesce(p_cliente, ''), 80), obs = left(coalesce(p_obs, ''), 300) where id = aberto;
  end if;
  insert into public.loja_vez_fila (portal_id, loja, dia, pessoa_id, status, ordem_em) values (q.portal_id, q.loja, hoje, q.id, 'fila', now())
    on conflict (portal_id, loja, dia, pessoa_id) do update set status = 'fila', ordem_em = now();
end $$;

revoke execute on function public.vez_encerrar(uuid, text, text, text, text) from public;
grant execute on function public.vez_encerrar(uuid, text, text, text, text) to anon, authenticated;
