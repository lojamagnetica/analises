-- Radar das iscas: as respostas dos formulários de isca (Respondi) numa tabela só.
-- Cada resposta guarda o texto original completo (bruto) e as colunas comuns (nome, WhatsApp, faturamento etc.).
-- "chave" evita duplicar quando o mesmo arquivo é importado de novo. Só a equipe vê. Os dados ficam só no Supabase.
set lock_timeout = '8s';

create table if not exists public.iscas_respostas (
  id               uuid primary key default gen_random_uuid(),
  isca             text not null,
  chave            text not null,
  respondido_em    timestamptz,
  importado_em     timestamptz not null default now(),
  nome             text,
  whatsapp         text,
  instagram        text,
  funcionarios     text,
  faturamento      text,
  topa_diagnostico boolean,
  desafio          text,
  motivo           text,
  temas            text[] not null default '{}',
  extras           jsonb not null default '{}'::jsonb,
  bruto            jsonb not null default '{}'::jsonb,
  unique (isca, chave)
);
create index if not exists iscas_respostas_whatsapp on public.iscas_respostas (whatsapp);
create index if not exists iscas_respostas_isca on public.iscas_respostas (isca);
alter table public.iscas_respostas enable row level security;
create policy iscas_respostas_equipe on public.iscas_respostas for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update, delete on public.iscas_respostas to authenticated;
