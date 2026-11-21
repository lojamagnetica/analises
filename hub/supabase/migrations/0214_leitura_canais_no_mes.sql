-- Análise da semana: o bloco de canais também mostra o acumulado do mês (volume e qualidade por canal).
set lock_timeout = '8s';
update public.metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb((dados->>'instrucoes') || $txt$

CANAIS NO MÊS (volume e qualidade)
Quando a loja mede canais, o bloco de canais mostra também o ACUMULADO DO MÊS até ontem, canal por canal: volume (R$, número de vendas e % do total vendido) e qualidade (ticket, P.A. e R$ por hora de trabalho do time). Diga com todas as letras qual canal traz o maior resultado da loja e qual consome mais tempo para menos venda, comparando o % do tempo com o % da venda.$txt$))
where chave = 'leitura_agente' and dados->>'instrucoes' not like '%CANAIS NO MÊS%';
