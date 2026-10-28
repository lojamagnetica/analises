-- Site: os fluxos do dia a dia em etapas (prospecção de clientes, pedidos da separação à entrega,
-- carrinhos abandonados e trocas/devoluções) e o POP de atendimento.

-- tipo: lead | pedido | carrinho | troca. etapa = onde está no fluxo.
-- info = campos de cada fluxo (origem, interesse, rastreio, itens, motivo...). avisado = etapa em que o cliente já foi avisado.
create table if not exists public.site_fluxos (
  id           uuid primary key default gen_random_uuid(),
  portal_id    uuid not null references public.portais (id) on delete cascade,
  tipo         text not null,
  nome         text not null default '',
  telefone     text not null default '',
  numero       text not null default '',
  valor        numeric not null default 0,
  etapa        text not null default '',
  responsavel  text not null default '',
  prazo        date,
  info         jsonb not null default '{}'::jsonb,
  avisado      text not null default '',
  dia          date not null default current_date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists site_fluxos_portal on public.site_fluxos (portal_id, tipo);
alter table public.site_fluxos enable row level security;
create policy site_fluxos_loja on public.site_fluxos for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- POP de atendimento do site (seções de texto que a loja edita).
create table if not exists public.site_config (
  portal_id  uuid primary key references public.portais (id) on delete cascade,
  pop        jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_config enable row level security;
create policy site_config_loja on public.site_config for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
