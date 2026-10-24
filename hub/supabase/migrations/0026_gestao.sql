-- Gestão estratégica: as análises de estoque, compras, linhas e fornecedores de cada loja (a equipe monta a partir dos
-- relatórios; a loja só lê depois de liberada). E os relatórios que a loja já mandou e estão no Drive da equipe.
set lock_timeout = '8s';

create table if not exists public.loja_gestao (
  portal_id   uuid not null references public.portais (id) on delete cascade,
  area        text not null check (area in ('estoque', 'compras', 'linhas', 'fornecedores')),
  loja        text not null default '',
  ordem       int  not null default 0,
  status      text not null default 'rascunho' check (status in ('rascunho', 'liberada')),
  dados       jsonb not null default '{}'::jsonb,
  liberada_em timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (portal_id, area, loja)
);
alter table public.loja_gestao enable row level security;
create policy gestao_ler    on public.loja_gestao for select using ((status = 'liberada' and public.pode_ver(portal_id)) or public.is_equipe());
create policy gestao_equipe on public.loja_gestao for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update on public.loja_gestao to authenticated;

create table if not exists public.loja_relatorios_drive (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  nome        text not null,
  tipo        text not null default 'Outro',
  periodo     text,
  url         text not null,
  recebido_em date,
  created_at  timestamptz not null default now(),
  unique (portal_id, url)
);
alter table public.loja_relatorios_drive enable row level security;
create policy relatorios_drive_ler    on public.loja_relatorios_drive for select using (public.pode_ver(portal_id));
create policy relatorios_drive_equipe on public.loja_relatorios_drive for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update on public.loja_relatorios_drive to authenticated;
