-- Fechamento de caixa: quanto entrou em cada forma de pagamento (pix, credito, debito, dinheiro, crediario), em reais.
alter table public.loja_caixa add column if not exists pagamentos jsonb;
