-- Itens vendidos por dia, lidos do relatório "Lista de Vendas" do sistema da loja. Servem para os mais vendidos da semana.
create table if not exists public.loja_caixa_itens (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portais(id) on delete cascade,
  loja text not null default '',
  dia date not null,
  venda text,
  vendedora text,
  codigo text,
  produto text not null,
  qtd int not null default 1,
  total numeric(12,2) not null default 0
);
create index if not exists loja_caixa_itens_dia on public.loja_caixa_itens (portal_id, dia);
alter table public.loja_caixa_itens enable row level security;
create policy caixa_itens_loja on public.loja_caixa_itens for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));
