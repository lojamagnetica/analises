-- Conversas da equipe: o canal interno só da Camilla e da CS (mais ninguém da equipe vê).
-- Cada conversa é ligada a uma loja (ou "geral"); mensagens viram lembretes, pendências, combinados e contatos.
-- Quem pode entrar é definido por perfis.conversas_equipe (marcado no banco, não aqui). Sem dado de cliente neste arquivo.
set lock_timeout = '8s';

alter table public.perfis add column if not exists conversas_equipe boolean not null default false;

create or replace function public.pode_conversas() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select conversas_equipe from public.perfis where id = auth.uid()), false)
$$;
grant execute on function public.pode_conversas() to authenticated;

create table if not exists public.equipe_conversas (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid references public.portais(id) on delete set null,   -- null = conversa geral
  tipo text not null default 'Alinhamento',                          -- Alinhamento | Pedido | Aviso | Urgente
  texto text not null,
  autor uuid,
  autor_nome text,
  para uuid,                                                          -- quem precisa agir (perfil)
  status text not null default 'aberta',                              -- aberta | concluida
  created_at timestamptz not null default now()
);
create index if not exists equipe_conversas_idx on public.equipe_conversas (portal_id, created_at desc);

create table if not exists public.equipe_lembretes (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid references public.portais(id) on delete set null,
  texto text not null,
  quando date,
  responsavel uuid,                                                   -- perfil de quem lembra
  feito boolean not null default false,
  conversa_id uuid references public.equipe_conversas(id) on delete set null,
  criado_por text,
  created_at timestamptz not null default now()
);
create index if not exists equipe_lembretes_idx on public.equipe_lembretes (responsavel, feito, quando);

alter table public.equipe_conversas enable row level security;
alter table public.equipe_lembretes enable row level security;
drop policy if exists conversas_so_elas on public.equipe_conversas;
create policy conversas_so_elas on public.equipe_conversas for all using (public.pode_conversas()) with check (public.pode_conversas());
drop policy if exists lembretes_so_elas on public.equipe_lembretes;
create policy lembretes_so_elas on public.equipe_lembretes for all using (public.pode_conversas()) with check (public.pode_conversas());
