-- Materiais da consultoria: os documentos entregues à loja ficam dentro do Hub (no lugar do Notion).
-- conteudo = texto no formato do componente Texto (## títulos, listas, tabelas com |, avisos com >).
-- arquivo = caminho no Storage (balde relatorios, pasta <portal_id>/materiais/), para planilha ou PDF anexo.
-- entrega_id = a entrega do plano que este material cumpre ("abrir material" no Painel).
create table if not exists public.consultoria_materiais (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  titulo      text not null,
  mes         text,
  entrega_id  uuid references public.consultoria_entregas (id) on delete set null,
  conteudo    text not null default '',
  arquivo     text,
  liberado    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists consultoria_materiais_portal on public.consultoria_materiais (portal_id);
alter table public.consultoria_materiais enable row level security;
-- A loja lê o que foi liberado; a equipe faz tudo.
create policy materiais_ler on public.consultoria_materiais for select using (public.is_equipe() or (liberado and public.pode_ver(portal_id)));
create policy materiais_equipe on public.consultoria_materiais for all using (public.is_equipe()) with check (public.is_equipe());
