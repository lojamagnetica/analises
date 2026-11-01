-- Resumo da reunião em rascunho: a equipe revisa e libera para a loja. A loja nunca lê esta tabela.
-- O resumo liberado vai para reunioes.ata (o que a loja vê). Formato: o que trouxemos da análise, correções pendentes e direcionamentos.
set lock_timeout = '8s';

create table if not exists public.reunioes_rascunho (
  reuniao_id uuid primary key references public.reunioes (id) on delete cascade,
  portal_id  uuid not null references public.portais (id) on delete cascade,
  resumo     text not null default '',
  interno    text not null default '',
  fonte      text not null default '',
  updated_at timestamptz not null default now()
);
create index if not exists reunioes_rascunho_portal on public.reunioes_rascunho (portal_id);
alter table public.reunioes_rascunho enable row level security;
drop policy if exists reunioes_rascunho_equipe on public.reunioes_rascunho;
create policy reunioes_rascunho_equipe on public.reunioes_rascunho for all using (public.is_equipe()) with check (public.is_equipe());
