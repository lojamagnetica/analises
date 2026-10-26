-- Meu estúdio: espaço de trabalho particular (criação de produtos, roteiros de gravação, ideias).
-- Cada documento tem um dono e só o dono enxerga, nem o resto da equipe.
alter table perfis add column if not exists estudio boolean not null default false;

create table if not exists estudio_docs (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  projeto text not null default 'Geral',
  tipo text not null default 'Roteiro de aula',
  titulo text not null,
  ref text,
  ordem int not null default 0,
  status text not null default 'Rascunho',
  conteudo text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists estudio_docs_dono on estudio_docs (dono, projeto, ordem);

alter table estudio_docs enable row level security;
drop policy if exists estudio_dono on estudio_docs;
create policy estudio_dono on estudio_docs for all to authenticated
  using (dono = auth.uid()) with check (dono = auth.uid());

-- Quem tem o estúdio é liberado direto no banco: update perfis set estudio = true where id = '<usuário>';

-- Portal só do curso (venda separada do Método Loja Magnética): tipo = 'Curso' em portais.tipo.
