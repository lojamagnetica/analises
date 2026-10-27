-- Planner de gestão (consultoria): os dias de cada etapa da gestão, separados em Atacado, Varejo, Gestão e Equipe,
-- e as datas fixas do mês. blocos = [{id, dia (0–6 = dom–sáb), frente, titulo, detalhe, quem}],
-- mensal = [{id, dia (1–31, 0 = último dia), frente, titulo, detalhe, quem}], feitos = {"AAAA-MM-DD": [id]}.
-- liberado = a Camilla revisou e a loja passa a ver.
create table if not exists public.loja_planner (
  portal_id  uuid primary key references public.portais (id) on delete cascade,
  blocos     jsonb not null default '[]'::jsonb,
  mensal     jsonb not null default '[]'::jsonb,
  feitos     jsonb not null default '{}'::jsonb,
  liberado   boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.loja_planner enable row level security;
create policy planner_loja on public.loja_planner for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
