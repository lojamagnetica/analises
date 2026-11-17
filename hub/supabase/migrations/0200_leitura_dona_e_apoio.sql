-- Análise da semana: a dona que também vende aparece só com os indicadores (sem feedback de vendedora);
-- quem é de apoio (estoque, cadastro, envios) e recebeu meta tem feedback pela função dela.
set lock_timeout = '8s';
update public.metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb((dados->>'instrucoes') || $txt$

DONA E APOIO NO TIME
- A dona que também vende (função "Dona" no time): mostre os indicadores dela (venda, vendas, P.A., ticket) como referência para o time, mas nunca dê feedback a ela como se fosse vendedora nem coloque conversa com ela nas ações.
- Quem tem outra função e dá apoio nas vendas (estoque, cadastro, envios) e recebeu meta ou missão no mês: o feedback leva em conta a função dela (ela divide o tempo) e usa a força da função na venda (ex.: quem cadastra o estoque sabe o que tem para montar o look).$txt$))
where chave = 'leitura_agente' and dados->>'instrucoes' not like '%DONA E APOIO NO TIME%';
