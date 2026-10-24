-- Portal com mais de um Instagram (ex.: loja feminina e masculina): análises extras, além da principal.
-- A loja só lê as liberadas; a equipe cuida de tudo. A principal continua em loja_analise_perfil.
create table public.loja_analise_extra (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  instagram   text not null,
  status      text not null default 'rascunho' check (status in ('rascunho', 'liberada')),
  dados       jsonb not null default '{}',
  liberada_em timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on public.loja_analise_extra (portal_id);
alter table public.loja_analise_extra enable row level security;
create policy extra_ler    on public.loja_analise_extra for select using ((status = 'liberada' and public.pode_ver(portal_id)) or public.is_equipe());
create policy extra_equipe on public.loja_analise_extra for all using (public.is_equipe()) with check (public.is_equipe());
