-- Plano de Ação: o título de cada mês é da loja (escrito pela Camilla), não mais fixo para todas.
set lock_timeout = '8s';
alter table public.portais add column if not exists plano_titulos jsonb not null default '{}'::jsonb;
comment on column public.portais.plano_titulos is 'Título de cada mês do Plano de Ação desta loja ({"1": "...", "2": "..."}), escrito pela Camilla.';
