-- Organograma da loja: quem responde a quem, as áreas, as pessoas e as responsabilidades de cada área.
-- dados = {topo: {nome, cargo}, areas: [{id, nome, pai, lider, pessoas: [{nome, funcao}], responsabilidades}]}.
-- liberado = a Camilla revisou e a loja passa a ver.
create table if not exists public.loja_organograma (
  portal_id  uuid primary key references public.portais (id) on delete cascade,
  dados      jsonb not null default '{}'::jsonb,
  liberado   boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.loja_organograma enable row level security;
create policy organograma_loja on public.loja_organograma for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
