-- Compras: a linha da peça (ouro, prata 925, semijoia, bijuteria...), como nas vendas e no estoque.
set lock_timeout = '8s';
alter table public.loja_compras add column if not exists linha text;
