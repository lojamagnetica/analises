-- Fechamento de caixa: quanto do dia foi malinha (enviada para a casa da cliente) e o resto é loja física.
-- Guarda só a parte da malinha: { faturamento, vendas, pecas }. Nulo = o dia não teve malinha.
alter table public.loja_caixa add column if not exists malinha jsonb;
