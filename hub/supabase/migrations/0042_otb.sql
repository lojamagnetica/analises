-- Guia de compras (OTB) dentro do Diagnóstico de estoque: o plano de compra da loja para os próximos 6 meses,
-- no mesmo modelo usado na consultoria (tudo a preço de custo):
--   compra liberada = estoque final alvo + venda do mês a custo − estoque inicial − o que já foi comprado e chega no mês.
-- dados: inicio (aaaa-mm), estoque_inicial (custo), markup, cobertura (meses), vendas {aaaa-mm: venda planejada},
-- pedidos [{id, descricao, mes de chegada, valor a custo}]. A loja e a equipe editam (pode_ver).
set lock_timeout = '8s';

create table if not exists public.loja_otb (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  loja       text not null default '',   -- vazio = a loja toda (portais com mais de uma loja escolhem qual)
  dados      jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by text,
  unique (portal_id, loja)
);
alter table public.loja_otb enable row level security;
create policy otb_tudo on public.loja_otb for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
grant select, insert, update, delete on public.loja_otb to authenticated;
