-- Atacado: prospecção, projeção por cliente, exclusividade, metas de abertura por coleção,
-- áreas potenciais e a política unificada (apresentação da marca, política comercial e exclusividade).

-- tipo: cliente (já comprou) ou prospect (em prospecção). etapa = etapa do funil de prospecção.
-- aberto_em = data do primeiro pedido (conta como abertura na coleção). projecao = quanto se espera do cliente na coleção.
alter table public.atacado_clientes add column if not exists tipo text not null default 'cliente';
alter table public.atacado_clientes add column if not exists etapa text not null default '';
alter table public.atacado_clientes add column if not exists aberto_em date;
alter table public.atacado_clientes add column if not exists projecao numeric not null default 0;
alter table public.atacado_clientes add column if not exists exclusivo boolean not null default false;

-- Política unificada: seções de texto que a loja edita (apresentação, política comercial, exclusividade).
alter table public.atacado_config add column if not exists politica jsonb not null default '[]'::jsonb;

-- Coleções com a meta de abertura de lojistas novos e de valor.
create table if not exists public.atacado_colecoes (
  id             uuid primary key default gen_random_uuid(),
  portal_id      uuid not null references public.portais (id) on delete cascade,
  nome           text not null,
  inicio         date not null,
  fim            date not null,
  meta_aberturas integer not null default 0,
  meta_valor     numeric not null default 0,
  obs            text not null default '',
  created_at     timestamptz not null default now()
);
create index if not exists atacado_colecoes_portal on public.atacado_colecoes (portal_id);
alter table public.atacado_colecoes enable row level security;
create policy atacado_colecoes_loja on public.atacado_colecoes for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Áreas potenciais para prospecção: cidades sem lojista (ou com praça fria) e o que fazer em cada uma.
create table if not exists public.atacado_areas (
  id           uuid primary key default gen_random_uuid(),
  portal_id    uuid not null references public.portais (id) on delete cascade,
  cidade       text not null,
  uf           text not null default '',
  potencial    text not null default 'medio',   -- alto | medio | baixo
  status       text not null default 'mapeada', -- mapeada | prospectando | aberta | descartada
  responsavel  text not null default '',
  motivo       text not null default '',
  created_at   timestamptz not null default now()
);
create index if not exists atacado_areas_portal on public.atacado_areas (portal_id);
alter table public.atacado_areas enable row level security;
create policy atacado_areas_loja on public.atacado_areas for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
