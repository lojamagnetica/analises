-- Anotações de atendimento: o que foi combinado em cada contato com a cliente, com data e quem escreveu.
-- Só a equipe vê. O texto fica só no Supabase.
set lock_timeout = '8s';

create table if not exists public.cliente_anotacoes (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  texto      text not null,
  por_nome   text,
  created_at timestamptz not null default now()
);
create index if not exists cliente_anotacoes_portal on public.cliente_anotacoes (portal_id, created_at desc);
alter table public.cliente_anotacoes enable row level security;
create policy cliente_anotacoes_equipe on public.cliente_anotacoes for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update, delete on public.cliente_anotacoes to authenticated;
