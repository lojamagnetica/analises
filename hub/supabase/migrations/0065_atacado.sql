-- Canais extras por loja (abas "Atacado" e "Site"). Ligado só onde faz sentido (hoje: Sea Live).
alter table public.portais add column if not exists canais text[] not null default '{}';

-- Atacado: a carteira de lojistas, os contatos das vendedoras e as metas de contato.
-- situação vem do último pedido: ativo (até 30 dias), em risco (31 a 60), parado (mais de 60).
-- motivo/decisao = a reativação dos parados (por que parou e o que fazer).
create table if not exists public.atacado_clientes (
  id           uuid primary key default gen_random_uuid(),
  portal_id    uuid not null references public.portais (id) on delete cascade,
  nome         text not null,
  documento    text not null default '',
  cidade       text not null default '',
  uf           text not null default '',
  canal        text not null default '',
  vendedora    text not null default '',
  telefone     text not null default '',
  ultimo_pedido date,
  total_ano    numeric not null default 0,
  pedidos      integer not null default 0,
  motivo       text not null default '',
  decisao      text not null default '',
  obs          text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists atacado_clientes_portal on public.atacado_clientes (portal_id);
alter table public.atacado_clientes enable row level security;
create policy atacado_clientes_loja on public.atacado_clientes for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

create table if not exists public.atacado_contatos (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  cliente_id  uuid not null references public.atacado_clientes (id) on delete cascade,
  vendedora   text not null default '',
  dia         date not null default current_date,
  resultado   text not null default '',
  obs         text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists atacado_contatos_portal on public.atacado_contatos (portal_id, dia);
alter table public.atacado_contatos enable row level security;
create policy atacado_contatos_loja on public.atacado_contatos for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Metas de contato por dia de cada vendedora: { "Sara": 15, ... }
create table if not exists public.atacado_config (
  portal_id  uuid primary key references public.portais (id) on delete cascade,
  metas      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.atacado_config enable row level security;
create policy atacado_config_loja on public.atacado_config for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
