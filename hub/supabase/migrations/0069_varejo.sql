-- Varejo (loja física) nas lojas com mais de um canal: rotina da loja, cronograma de treinamentos,
-- programa de fidelização e contatos padronizados.

-- A rotina da loja usa o mesmo checklist da operação do site, separado por área.
alter table public.site_operacao add column if not exists area text not null default 'site';

-- Cronograma de treinamento de produtos e vendas.
create table if not exists public.loja_treinamentos (
  id            uuid primary key default gen_random_uuid(),
  portal_id     uuid not null references public.portais (id) on delete cascade,
  dia           date not null,
  tipo          text not null default 'produto', -- produto | vendas
  tema          text not null,
  conduz        text not null default '',
  participantes text not null default '',
  material      text not null default '',
  feito         boolean not null default false,
  obs           text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists loja_treinamentos_portal on public.loja_treinamentos (portal_id, dia);
alter table public.loja_treinamentos enable row level security;
create policy loja_treinamentos_loja on public.loja_treinamentos for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Textos da loja em seções (programa de fidelização, contatos padronizados...). chave = qual texto.
create table if not exists public.portal_textos (
  portal_id  uuid not null references public.portais (id) on delete cascade,
  chave      text not null,
  secoes     jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (portal_id, chave)
);
alter table public.portal_textos enable row level security;
create policy portal_textos_loja on public.portal_textos for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
