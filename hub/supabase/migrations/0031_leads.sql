-- Leads do Comercial: quem está negociando com a equipe, em que etapa e quando é o próximo contato.
-- Etapas: Novo, Conversando, Proposta, Fechou e Perdido. Quando fecha, a venda é registrada em Nova venda
-- e o lead guarda o portal criado. Só a equipe vê. Os dados ficam só no Supabase.
set lock_timeout = '8s';

create table if not exists public.leads (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  loja           text,
  whatsapp       text,
  instagram      text,
  origem         text,
  etapa          text not null default 'Novo' check (etapa in ('Novo', 'Conversando', 'Proposta', 'Fechou', 'Perdido')),
  valor_estimado numeric(12, 2),
  responsavel    text,
  proximo_contato date,
  obs            text,
  motivo_perda   text,
  portal_id      uuid references public.portais (id) on delete set null,
  criado_por     text,
  created_at     timestamptz not null default now(),
  etapa_em       timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists leads_etapa on public.leads (etapa);
create index if not exists leads_proximo_contato on public.leads (proximo_contato);
alter table public.leads enable row level security;
create policy leads_equipe on public.leads for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update, delete on public.leads to authenticated;
