-- Diagnóstico da loja: o resumo vivo de cada loja (cenário, performance, estoque, curva ABC, marcas, linhas e equipe).
-- Uma linha por loja do portal ('' = a loja única ou a visão das lojas juntas). A equipe monta; a loja só lê depois de liberado.
set lock_timeout = '8s';

create table if not exists public.loja_diagnostico (
  portal_id   uuid not null references public.portais (id) on delete cascade,
  loja        text not null default '',
  ordem       int  not null default 0,
  status      text not null default 'rascunho' check (status in ('rascunho', 'liberada')),
  dados       jsonb not null default '{}'::jsonb,
  liberada_em timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (portal_id, loja)
);

alter table public.loja_diagnostico enable row level security;
create policy diagnostico_ler    on public.loja_diagnostico for select using ((status = 'liberada' and public.pode_ver(portal_id)) or public.is_equipe());
create policy diagnostico_equipe on public.loja_diagnostico for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update on public.loja_diagnostico to authenticated;
