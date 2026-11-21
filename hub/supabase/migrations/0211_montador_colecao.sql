-- Montador da coleção (Conteúdo › Montador da coleção) e Modelos do mês por segmento.
-- A identidade de cada coleção (logo, cores, textos) fica só no banco: o repositório é público.

create table if not exists public.loja_montadores (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portais(id) on delete cascade,
  colecao text not null,
  ativo boolean not null default true,
  liberado boolean not null default false,
  identidade jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists loja_montadores_portal on public.loja_montadores (portal_id);
alter table public.loja_montadores enable row level security;
drop policy if exists montadores_ver on public.loja_montadores;
create policy montadores_ver on public.loja_montadores for select
  using (public.is_equipe() or (public.pode_ver(portal_id) and liberado and ativo));
drop policy if exists montadores_equipe on public.loja_montadores;
create policy montadores_equipe on public.loja_montadores for all
  using (public.is_equipe()) with check (public.is_equipe());

create table if not exists public.modelos_mes (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  segmento text not null,
  ordem int not null default 1,
  nome text not null,
  descricao text,
  referencia_url text,
  referencia_perfil text,
  referencia_data date,
  curtidas int,
  comentarios int,
  slides jsonb not null default '[]'::jsonb,
  liberado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists modelos_mes_mes on public.modelos_mes (mes, segmento);
alter table public.modelos_mes enable row level security;
drop policy if exists modelos_ver on public.modelos_mes;
create policy modelos_ver on public.modelos_mes for select using (public.is_equipe() or liberado);
drop policy if exists modelos_equipe on public.modelos_mes;
create policy modelos_equipe on public.modelos_mes for all
  using (public.is_equipe()) with check (public.is_equipe());
