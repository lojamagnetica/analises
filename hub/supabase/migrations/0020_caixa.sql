-- Fechamento de caixa: os números de cada dia da loja (faturamento, vendas e peças).
-- Base do Painel da loja (PA, ticket médio e preço médio). A própria loja lança, corrige e tira os dias.
-- Portal com mais de uma loja: cada dia é de uma loja (loja null = portal com uma loja só).
create table public.loja_caixa (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  loja        text,
  dia         date not null,
  faturamento numeric not null default 0,
  vendas      int  not null default 0,
  pecas       int  not null default 0,
  obs         text,
  created_at  timestamptz default now(),
  unique nulls not distinct (portal_id, loja, dia)
);
create index on public.loja_caixa (portal_id, dia);
alter table public.loja_caixa enable row level security;
create policy caixa_loja on public.loja_caixa for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
