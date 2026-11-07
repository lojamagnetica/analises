-- Mural da loja: missão, visão, valores, versículo, metas da semana (P.A. e TKM) e calendário de eventos.
-- Um registro por loja (loja = '' no portal de uma loja só). Tudo editável pela loja.
create table if not exists public.loja_mural (
  portal_id  uuid not null references public.portais (id) on delete cascade,
  loja       text not null default '',
  dados      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (portal_id, loja)
);
alter table public.loja_mural enable row level security;
drop policy if exists loja_mural_loja on public.loja_mural;
create policy loja_mural_loja on public.loja_mural for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
