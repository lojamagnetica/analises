-- Pendências por cliente: o que falta para o portal ficar completo. As automáticas saem dos dados do Hub
-- (a tela calcula); aqui fica só o andamento de cada uma (solicitado, recebido, dispensado) e as pendências escritas à mão.
-- Só a equipe vê.
set lock_timeout = '8s';

create table if not exists public.portal_pendencias (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  chave       text not null,
  texto       text,
  quem        text not null default 'Loja' check (quem in ('Loja', 'Equipe')),
  manual      boolean not null default false,
  status      text not null default 'pendente' check (status in ('pendente', 'solicitado', 'recebido', 'dispensado')),
  obs         text,
  por_nome    text,
  updated_at  timestamptz not null default now(),
  unique (portal_id, chave)
);

alter table public.portal_pendencias enable row level security;
create policy pendencias_equipe on public.portal_pendencias for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update on public.portal_pendencias to authenticated;
