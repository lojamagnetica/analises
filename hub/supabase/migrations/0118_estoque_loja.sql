-- Estoque da loja (loja na mão): contagem por tipo de peça, linha e preço, sem cadastrar peça a peça.
-- Ex.: "Anel · Prata 925 · R$ 89 · 10 peças". Atual = contado + entradas − vendido depois da contagem.
-- A venda pode apontar o grupo do estoque (estoque_id) e guarda a linha (ouro, prata 925, semijoia...).
set lock_timeout = '8s';

create table if not exists public.loja_estoque (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  categoria   text not null,
  linha       text,
  preco       numeric not null check (preco >= 0),
  qtd         int not null default 0 check (qtd >= 0),
  entradas    int not null default 0 check (entradas >= 0),
  contado_em  date not null default current_date,
  obs         text,
  created_at  timestamptz default now()
);
create index if not exists loja_estoque_portal on public.loja_estoque (portal_id);
alter table public.loja_estoque enable row level security;
create policy loja_estoque_portal on public.loja_estoque for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

alter table public.loja_vendas add column if not exists linha text;
alter table public.loja_vendas add column if not exists estoque_id uuid references public.loja_estoque (id) on delete set null;
