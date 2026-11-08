-- Vendas do dia com vários itens: cada item com tipo, linha, peça, valor, peças e o grupo do estoque.
-- As colunas de sempre (categoria, linha, valor, pecas) continuam com o resumo da venda.
set lock_timeout = '8s';
alter table public.loja_vendas add column if not exists itens jsonb;
