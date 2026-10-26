-- Link da Bio: uma página por loja, aberta para quem tem o link (/bio?l=<slug>) só depois de publicada.
-- A loja e a equipe editam pela RLS (pode_ver). O público lê só pelo bio_publica(slug) e conta cliques
-- pelo bio_clique(slug, bloco). A Ação do mês vem da ação ativa da loja em Vendas › Ações do Mês.
set lock_timeout = '8s';

create table if not exists public.bio_paginas (
  id           uuid primary key default gen_random_uuid(),
  portal_id    uuid not null unique references public.portais (id) on delete cascade,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40),
  perfil       jsonb not null default '{}',
  blocos       jsonb not null default '[]',
  aparencia    jsonb not null default '{}',
  publicada    boolean not null default false,
  publicada_em timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.bio_paginas enable row level security;
create policy bio_tudo on public.bio_paginas for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
grant select, insert, update, delete on public.bio_paginas to authenticated;

create table if not exists public.bio_cliques (
  pagina_id  uuid not null references public.bio_paginas (id) on delete cascade,
  bloco      text not null,
  total      int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (pagina_id, bloco)
);
alter table public.bio_cliques enable row level security;
create policy bio_cliques_ler on public.bio_cliques for select
  using (exists (select 1 from public.bio_paginas b where b.id = pagina_id and public.pode_ver(b.portal_id)));
grant select on public.bio_cliques to authenticated;

-- A página publicada, com a ação ativa da loja (para o bloco Ação do mês).
create or replace function public.bio_publica(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'slug', b.slug, 'perfil', b.perfil, 'blocos', b.blocos, 'aparencia', b.aparencia,
    'acao', (
      select jsonb_build_object('titulo', a.titulo, 'resumo', a.resumo, 'oferta', a.oferta, 'fim', a.fim)
      from public.loja_acoes la join public.acoes a on a.id = la.acao_id
      where la.portal_id = b.portal_id and not la.concluida and a.publicada
        and (now() at time zone 'America/Recife')::date between a.inicio and a.fim
      order by coalesce(a.venda_inicio, a.data_acao) limit 1))
  from public.bio_paginas b
  where b.slug = lower(trim(p_slug)) and b.publicada
$$;
revoke execute on function public.bio_publica(text) from public;
grant execute on function public.bio_publica(text) to anon, authenticated;

-- Um clique num bloco da página publicada.
create or replace function public.bio_clique(p_slug text, p_bloco text) returns void
language sql security definer set search_path = public as $$
  insert into public.bio_cliques (pagina_id, bloco, total)
  select b.id, left(p_bloco, 40), 1 from public.bio_paginas b
  where b.slug = lower(trim(p_slug)) and b.publicada
    and exists (select 1 from jsonb_array_elements(b.blocos) e where e->>'id' = p_bloco)
  on conflict (pagina_id, bloco) do update set total = bio_cliques.total + 1, updated_at = now()
$$;
revoke execute on function public.bio_clique(text, text) from public;
grant execute on function public.bio_clique(text, text) to anon, authenticated;
