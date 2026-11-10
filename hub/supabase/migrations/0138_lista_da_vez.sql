-- Lista da vez: a fila de atendimento da loja, o resultado de cada atendimento (vendeu ou não, e o motivo)
-- e a missão do dia de cada pessoa. A equipe abre pelo celular, com um link pessoal (sem entrar no Hub).

alter table public.loja_equipe add column if not exists vez_token uuid not null default gen_random_uuid();
create unique index if not exists loja_equipe_vez_token on public.loja_equipe (vez_token);

-- Quem está na lista hoje. A ordem é pela hora em que entrou na fila; quem atende volta para o final.
create table if not exists public.loja_vez_fila (
  portal_id uuid not null references public.portais (id) on delete cascade,
  loja      text not null default '',
  dia       date not null,
  pessoa_id uuid not null references public.loja_equipe (id) on delete cascade,
  status    text not null default 'fila' check (status in ('fila', 'atendendo')),
  chegou_em timestamptz not null default now(),
  ordem_em  timestamptz not null default now(),
  primary key (portal_id, loja, dia, pessoa_id)
);

-- Cada atendimento: quando começou e terminou, se vendeu, o motivo e a cliente (se quiser anotar).
create table if not exists public.loja_vez_atend (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  loja        text not null default '',
  dia         date not null,
  pessoa_id   uuid references public.loja_equipe (id) on delete set null,
  nome        text not null default '',
  inicio_em   timestamptz not null default now(),
  fim_em      timestamptz,
  resultado   text check (resultado in ('vendeu', 'nao_vendeu')),
  motivo      text not null default '',
  cliente     text not null default '',
  fora_da_vez boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists loja_vez_atend_dia on public.loja_vez_atend (portal_id, dia);

-- A missão do dia que a gestora põe para cada pessoa; a pessoa dá o check.
create table if not exists public.loja_missao_dia (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  dia        date not null,
  pessoa_id  uuid not null references public.loja_equipe (id) on delete cascade,
  texto      text not null,
  feito      boolean not null default false,
  feito_em   timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists loja_missao_dia_dia on public.loja_missao_dia (portal_id, dia);

alter table public.loja_vez_fila enable row level security;
alter table public.loja_vez_atend enable row level security;
alter table public.loja_missao_dia enable row level security;
drop policy if exists loja_vez_fila_loja on public.loja_vez_fila;
drop policy if exists loja_vez_atend_loja on public.loja_vez_atend;
drop policy if exists loja_missao_dia_loja on public.loja_missao_dia;
create policy loja_vez_fila_loja on public.loja_vez_fila for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy loja_vez_atend_loja on public.loja_vez_atend for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy loja_missao_dia_loja on public.loja_missao_dia for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- ───── O que a equipe faz pelo link pessoal (token) ─────

create or replace function public.vez_quem(p_token uuid) returns table (id uuid, portal_id uuid, nome text, loja text)
language sql stable security definer set search_path = public as $$
  select e.id, e.portal_id, e.nome, coalesce(e.loja, '')
  from public.loja_equipe e where p_token is not null and e.vez_token = p_token and coalesce(e.ativo, true)
$$;

-- Tudo o que a tela da pessoa precisa: a lista de hoje, os atendimentos, a missão do dia, os números do mês e a meta.
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
    'atend', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'pessoa_id', a.pessoa_id, 'nome', split_part(a.nome, ' ', 1), 'inicio_em', a.inicio_em, 'fim_em', a.fim_em, 'resultado', a.resultado, 'motivo', a.motivo, 'cliente', a.cliente) order by a.inicio_em)
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

create or replace function public.vez_entrar(p_token uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  insert into public.loja_vez_fila (portal_id, loja, dia, pessoa_id) values (q.portal_id, q.loja, hoje, q.id) on conflict do nothing;
end $$;

create or replace function public.vez_sair(p_token uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  delete from public.loja_vez_fila where portal_id = q.portal_id and loja = q.loja and dia = hoje and pessoa_id = q.id and status = 'fila';
end $$;

-- Passar a vez: vai para o final da lista sem atender.
create or replace function public.vez_passar(p_token uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  update public.loja_vez_fila set ordem_em = now() where portal_id = q.portal_id and loja = q.loja and dia = hoje and pessoa_id = q.id and status = 'fila';
end $$;

-- Começa um atendimento. Só quem está na lista; se não era a primeira, fica marcado "fora da vez".
create or replace function public.vez_atender(p_token uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date; eu timestamptz; fora boolean; novo uuid;
begin
  select * into q from public.vez_quem(p_token); if not found then return null; end if;
  select ordem_em into eu from public.loja_vez_fila where portal_id = q.portal_id and loja = q.loja and dia = hoje and pessoa_id = q.id and status = 'fila';
  if eu is null then return null; end if;
  fora := exists (select 1 from public.loja_vez_fila f where f.portal_id = q.portal_id and f.loja = q.loja and f.dia = hoje and f.status = 'fila' and f.ordem_em < eu);
  update public.loja_vez_fila set status = 'atendendo' where portal_id = q.portal_id and loja = q.loja and dia = hoje and pessoa_id = q.id;
  insert into public.loja_vez_atend (portal_id, loja, dia, pessoa_id, nome, fora_da_vez) values (q.portal_id, q.loja, hoje, q.id, q.nome, fora) returning id into novo;
  return novo;
end $$;

-- Termina o atendimento: vendeu ou não vendeu (com o motivo) e volta para o final da lista.
create or replace function public.vez_encerrar(p_token uuid, p_resultado text, p_motivo text, p_cliente text) returns void
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date; aberto uuid;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  if p_resultado not in ('vendeu', 'nao_vendeu') then return; end if;
  select id into aberto from public.loja_vez_atend where portal_id = q.portal_id and pessoa_id = q.id and dia = hoje and fim_em is null order by inicio_em desc limit 1;
  if aberto is not null then
    update public.loja_vez_atend set fim_em = now(), resultado = p_resultado, motivo = left(coalesce(p_motivo, ''), 200), cliente = left(coalesce(p_cliente, ''), 80) where id = aberto;
  end if;
  insert into public.loja_vez_fila (portal_id, loja, dia, pessoa_id, status, ordem_em) values (q.portal_id, q.loja, hoje, q.id, 'fila', now())
    on conflict (portal_id, loja, dia, pessoa_id) do update set status = 'fila', ordem_em = now();
end $$;

-- Corrigir um atendimento de hoje (a pessoa errou o toque).
create or replace function public.vez_corrigir(p_token uuid, p_id uuid, p_resultado text, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  if p_resultado not in ('vendeu', 'nao_vendeu') then return; end if;
  update public.loja_vez_atend set resultado = p_resultado, motivo = left(coalesce(p_motivo, ''), 200)
  where id = p_id and portal_id = q.portal_id and pessoa_id = q.id and dia = hoje;
end $$;

create or replace function public.vez_missao_marcar(p_token uuid, p_id uuid, p_feito boolean) returns void
language plpgsql security definer set search_path = public as $$
declare q record;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  update public.loja_missao_dia set feito = p_feito, feito_em = case when p_feito then now() else null end
  where id = p_id and portal_id = q.portal_id and pessoa_id = q.id;
end $$;

revoke execute on function public.vez_quem(uuid) from public, anon, authenticated;
do $$ declare f text; begin
  foreach f in array array['vez_painel(uuid)', 'vez_entrar(uuid)', 'vez_sair(uuid)', 'vez_passar(uuid)', 'vez_atender(uuid)', 'vez_encerrar(uuid,text,text,text)', 'vez_corrigir(uuid,uuid,text,text)', 'vez_missao_marcar(uuid,uuid,boolean)'] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
