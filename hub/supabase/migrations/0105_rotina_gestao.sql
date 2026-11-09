-- Rotina da gestão: análise da semana por loja e os boletos do mês (a vencer e pago, por loja).
set lock_timeout = '8s';

alter table public.loja_reunioes drop constraint if exists loja_reunioes_tipo_check;
alter table public.loja_reunioes add constraint loja_reunioes_tipo_check
  check (tipo in ('semanal', 'mensal', 'abertura', 'reta_final', 'individual', 'analise', 'planejamento', 'analise_semana'));

create table if not exists public.loja_boletos_mes (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portais (id) on delete cascade,
  loja text not null default '',
  mes text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  a_vencer numeric not null default 0,
  pago numeric not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (portal_id, loja, mes)
);
alter table public.loja_boletos_mes enable row level security;
drop policy if exists boletos_mes_tudo on public.loja_boletos_mes;
create policy boletos_mes_tudo on public.loja_boletos_mes for all
  using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
grant select, insert, update, delete on public.loja_boletos_mes to authenticated;
