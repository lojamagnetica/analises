-- Conteúdo no portal da loja: a Análise do Perfil (feita pela equipe Loja Magnética),
-- as escolhas e o progresso da loja, e a programação dos posts com os resultados.
-- O módulo só abre para a loja depois que a equipe libera a análise.
-- O texto do método (regras, roteiros-modelo, ganchos, checklist, desafio) fica na tabela metodo, chave 'conteudo'.

create table public.loja_analise_perfil (
  portal_id   uuid primary key references public.portais (id) on delete cascade,
  status      text not null default 'rascunho' check (status in ('rascunho', 'liberada')),
  dados       jsonb not null default '{}',
  liberada_em timestamptz,
  updated_at  timestamptz not null default now()
);

-- O que a loja escolhe e marca: correções feitas, dias de postar, série fixa, missões do desafio.
create table public.loja_conteudo (
  portal_id  uuid primary key references public.portais (id) on delete cascade,
  feitas     text[] not null default '{}',
  ajustes    jsonb not null default '{}',
  desafio    jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.loja_posts (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  data       date not null,
  hora       text,
  formato    text not null default 'Reels',
  objetivo   text not null default 'Atrair' check (objetivo in ('Atrair', 'Conectar', 'Vender')),
  tema       text not null default '',
  gancho     text not null default '',
  roteiro    text not null default '',
  legenda    text not null default '',
  cta        text not null default '',
  origem     text,                       -- 'ideia', 'serie', 'acao', 'data', 'desafio'
  status     text not null default 'Ideia' check (status in ('Ideia', 'Roteiro', 'Gravado', 'Programado', 'Publicado')),
  com_rosto  boolean,
  views      int,
  comentarios int,
  mensagens  int,
  vendas     int,
  created_at timestamptz not null default now()
);
create index on public.loja_posts (portal_id, data);

alter table public.loja_analise_perfil enable row level security;
alter table public.loja_conteudo       enable row level security;
alter table public.loja_posts          enable row level security;

-- A loja só lê a análise depois de liberada; a equipe faz tudo.
create policy analise_equipe on public.loja_analise_perfil for all using (public.is_equipe()) with check (public.is_equipe());
create policy analise_ler    on public.loja_analise_perfil for select using (status = 'liberada' and public.pode_ver(portal_id));
create policy conteudo_tudo  on public.loja_conteudo for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
create policy posts_tudo     on public.loja_posts    for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
