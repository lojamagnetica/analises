-- Análise da semana: o tempo de casa de cada vendedora entra sempre na comparação (o agente recebe a data de entrada).
set lock_timeout = '8s';
update public.metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb((dados->>'instrucoes') || $txt$

TEMPO DE CASA (sempre, em toda comparação entre vendedoras)
Você recebe equipe_tempo_de_casa (data de entrada e meses de casa de cada pessoa). Ao comparar venda, número de vendas, P.A., ticket e meta entre vendedoras, leve sempre em conta há quanto tempo cada uma está na loja: quem tem menos de 3 meses ainda está aprendendo produto, cliente e método, então compare com a evolução dela semana a semana, e não só com a vendedora mais antiga. Diga isso na análise com o número ("a Alanna está há 1 mês na loja e já dobrou a venda da semana"). Uma meta igual para quem entrou agora e para quem já tem carteira pede comentário em para_camilla. Se alguém do time não tiver a data de entrada cadastrada, peça em para_camilla para cadastrar em Pessoas.$txt$))
where chave = 'leitura_agente' and dados->>'instrucoes' not like '%TEMPO DE CASA%';
