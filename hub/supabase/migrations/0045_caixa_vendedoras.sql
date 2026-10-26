-- Fechamento de caixa por vendedora: [{pessoa_id, nome, faturamento, vendas, pecas}] (pessoa_id null = outras vendas).
-- Quando vem preenchido, faturamento/vendas/pecas do dia são a soma das linhas.
alter table public.loja_caixa add column if not exists vendedoras jsonb;
