-- Comercial e Central do Cliente.
-- passagens: o que o Comercial registra na venda (a passagem de bastão para a CS).
-- jornada_checks: o checklist de cada etapa da jornada por cliente (quem fez, quando, e a data marcada quando há).
-- Tudo só da equipe.
set lock_timeout = '8s';

create table if not exists public.passagens (
  portal_id      uuid primary key references public.portais (id) on delete cascade,
  vendido_por    text,
  plano_id       text references public.planos (id),
  valor          numeric(12, 2),
  pagamento_em   date,
  forma_pagamento text,
  resultado_90   text,
  alinhado       boolean not null default false,
  origem         text,
  observacoes    text,
  criado_por     text,
  created_at     timestamptz not null default now(),
  recebida_em    timestamptz,
  recebida_por   text
);
alter table public.passagens enable row level security;
create policy passagens_equipe on public.passagens for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update on public.passagens to authenticated;

create table if not exists public.jornada_checks (
  portal_id  uuid not null references public.portais (id) on delete cascade,
  chave      text not null,
  feito      boolean not null default true,
  marcado_para timestamptz,
  obs        text,
  por_nome   text,
  updated_at timestamptz not null default now(),
  primary key (portal_id, chave)
);
alter table public.jornada_checks enable row level security;
create policy jornada_checks_equipe on public.jornada_checks for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update on public.jornada_checks to authenticated;

-- Dados da contratante (vão para o contrato) e condições da venda.
alter table public.passagens
  add column if not exists contratante_nome text,
  add column if not exists contratante_doc text,
  add column if not exists contratante_endereco text,
  add column if not exists representante text,
  add column if not exists representante_cargo text,
  add column if not exists representante_cpf text,
  add column if not exists lojas_mentoradas text,
  add column if not exists email_contrato text,
  add column if not exists bonus boolean not null default false,
  add column if not exists garantia boolean not null default false;

-- Modelo de contrato de cada plano. O texto usa campos {{ASSIM}} e blocos opcionais [[BONUS]]…[[/BONUS]].
create table if not exists public.contrato_modelos (
  plano_id   text primary key references public.planos (id),
  titulo     text not null,
  texto      text not null,
  aprovado   boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.contrato_modelos enable row level security;
create policy contrato_modelos_equipe on public.contrato_modelos for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update on public.contrato_modelos to authenticated;

-- Contrato gerado para cada cliente (o texto final, para conferir o que foi mandado).
create table if not exists public.contratos_gerados (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  plano_id   text references public.planos (id),
  texto      text not null,
  status     text not null default 'Gerado' check (status in ('Gerado', 'Enviado', 'Assinado')),
  gerado_por text,
  created_at timestamptz not null default now()
);
alter table public.contratos_gerados enable row level security;
create policy contratos_gerados_equipe on public.contratos_gerados for all using (public.is_equipe()) with check (public.is_equipe());
grant select, insert, update on public.contratos_gerados to authenticated;
