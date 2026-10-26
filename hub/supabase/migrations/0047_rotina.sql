-- Meu dia: a rotina da lojista (dia da reunião semanal individual, do calendário de conteúdo e do planejamento do mês)
-- e o que ela marcou como feito em cada dia ({"2026-11-18": ["reuniao", "caixa_ontem"]}).
create table if not exists public.loja_rotina (
  portal_id  uuid primary key references public.portais (id) on delete cascade,
  config     jsonb not null default '{}'::jsonb,
  feitos     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.loja_rotina enable row level security;
create policy rotina_loja on public.loja_rotina for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
