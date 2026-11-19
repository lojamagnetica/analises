-- Planner do Meu dia (Camilla): o foco do dia e o fechamento ficam guardados por pessoa e por dia.
-- Cada pessoa só lê e grava o próprio dia.
create table if not exists public.meu_dia_planner (
  perfil_id uuid not null default auth.uid() references public.perfis(id) on delete cascade,
  dia date not null,
  foco text,
  vitoria text,
  amanha text,
  fechado_em timestamptz,
  updated_at timestamptz not null default now(),
  primary key (perfil_id, dia)
);

alter table public.meu_dia_planner enable row level security;

drop policy if exists meu_dia_planner_so_meu on public.meu_dia_planner;
create policy meu_dia_planner_so_meu on public.meu_dia_planner
  for all using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
