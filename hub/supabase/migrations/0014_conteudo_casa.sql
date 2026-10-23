-- Conteúdo da casa: o planejamento do @magnetica.hub (empresa) e do perfil da Camilla (@camillaribeiromentora).
-- Um post passa por Ideia → Planejado → Roteiro pronto → Gravado ou arte pronta → Postado.
-- "conteudo" guarda o material pronto em Markdown (slides do carrossel, teleprompter, roteiro em colunas).
-- Só a equipe vê e mexe.

create table public.conteudo_casa (
  id                uuid primary key default gen_random_uuid(),
  perfil            text not null check (perfil in ('magnetica', 'camilla')),
  data              date,
  horario           text,
  formato           text not null default 'Reel no carro',
  funcao            text,
  editoria          text,
  titulo            text not null default '',
  gancho            text not null default '',
  angulo            text not null default '',
  palavra_chave     text,
  conteudo          text not null default '',
  legenda           text not null default '',
  comentario_fixado text,
  status            text not null default 'Ideia'
                    check (status in ('Ideia', 'Planejado', 'Roteiro pronto', 'Gravado ou arte pronta', 'Postado')),
  alcance           int,
  envios            int,
  notion_url        text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.conteudo_casa (perfil, data);

alter table public.conteudo_casa enable row level security;
create policy conteudo_casa_equipe on public.conteudo_casa for all using (public.is_equipe()) with check (public.is_equipe());
