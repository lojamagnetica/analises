-- Fechamento de caixa: quanto do dia foi malinha (a cliente leva as peças para provar em casa, enviadas ou retiradas na loja) e o resto é loja física.
-- Guarda só a parte da malinha: { faturamento, vendas, pecas }. Nulo = o dia não teve malinha.
alter table public.loja_caixa add column if not exists malinha jsonb;
