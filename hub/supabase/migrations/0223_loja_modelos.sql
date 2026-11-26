-- Modelos de card da campanha (cards de live, convite, frases): a arte fica travada
-- (cores, logo, letras) e a loja só troca os textos e a foto. O HTML do modelo fica no
-- Storage (relatorios/<portal>/modelos/...), aqui ficam o nome, o tamanho e os campos.
create table if not exists public.loja_modelos (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portais(id) on delete cascade,
  nome text not null,
  grupo text not null default '',               -- a série: "Cards das lives", "Convites"
  largura int not null default 1080,
  altura int not null default 1350,
  arquivo text not null,                        -- caminho do HTML no Storage
  campos jsonb not null default '[]'::jsonb,    -- [{ chave, rotulo, tipo: texto|linhas|foto, valor }]
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists loja_modelos_portal on public.loja_modelos (portal_id, grupo, ordem);
alter table public.loja_modelos enable row level security;
drop policy if exists modelos_equipe on public.loja_modelos;
drop policy if exists modelos_ler on public.loja_modelos;
create policy modelos_equipe on public.loja_modelos for all using (public.is_equipe()) with check (public.is_equipe());
create policy modelos_ler on public.loja_modelos for select using (public.pode_ver(portal_id));
