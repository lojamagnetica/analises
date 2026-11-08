-- Loja na mão (personalizado por loja): Vendas do dia, Crediário e Compras, feitos para a dona lançar pelo celular.
-- Cada venda soma sozinha o Fechamento de caixa do dia e atualiza a cliente. Venda no crediário abre a conta da cliente.
-- Parcelas em jsonb: [{ "vence": "2026-12-10", "valor": 100, "pago_em": null }].
set lock_timeout = '8s';

alter table public.portais add column if not exists venda_diaria boolean not null default false;

create table if not exists public.loja_vendas (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  dia         date not null,
  categoria   text not null,
  produto     text,
  valor       numeric not null check (valor >= 0),
  pecas       int not null default 1 check (pecas > 0),
  forma       text not null,
  cliente_id  uuid references public.loja_clientes (id) on delete set null,
  maleta      boolean not null default false,
  created_at  timestamptz default now()
);
create index if not exists loja_vendas_portal_dia on public.loja_vendas (portal_id, dia);
alter table public.loja_vendas enable row level security;
create policy loja_vendas_portal on public.loja_vendas for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

create table if not exists public.loja_crediario (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  cliente_id  uuid references public.loja_clientes (id) on delete set null,
  nome        text not null,
  whatsapp    text,
  venda_id    uuid references public.loja_vendas (id) on delete set null,
  descricao   text,
  parcelas    jsonb not null default '[]',
  created_at  timestamptz default now()
);
create index if not exists loja_crediario_portal on public.loja_crediario (portal_id);
alter table public.loja_crediario enable row level security;
create policy loja_crediario_portal on public.loja_crediario for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

create table if not exists public.loja_compras (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  dia         date not null,
  fornecedor  text not null,
  categoria   text,
  pecas       int,
  valor       numeric not null check (valor >= 0),
  parcelas    jsonb not null default '[]',
  obs         text,
  created_at  timestamptz default now()
);
create index if not exists loja_compras_portal_dia on public.loja_compras (portal_id, dia);
alter table public.loja_compras enable row level security;
create policy loja_compras_portal on public.loja_compras for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
