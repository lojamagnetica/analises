-- Portais com mais de uma loja: o portal inteiro pode virar uma loja só (seletor no topo).
-- Cada pessoa pode ter a sua loja padrão (abre direto nela) e o Planner de gestão passa a ser por loja
-- (loja '' = as lojas juntas, como antes).
set lock_timeout = '8s';

alter table public.perfis add column if not exists loja_padrao text;

alter table public.loja_planner add column if not exists loja text not null default '';
alter table public.loja_planner drop constraint if exists loja_planner_pkey;
alter table public.loja_planner add constraint loja_planner_pkey primary key (portal_id, loja);
