-- Análise da semana: loja pulverizada em muitos canais e estoque. O bloco de canais termina com os 2 canais
-- em que vale concentrar a energia e o que reduzir; no estoque, poucas categorias com foco.
set lock_timeout = '8s';
update public.metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb((dados->>'instrucoes') || $txt$

FOCO DE ENERGIA (loja pulverizada em muitos canais e muito estoque)
Quando a loja mede canais, termine o bloco de canais com uma escolha clara: OS 2 CANAIS em que vale concentrar a energia do time (pelo que vendem, pelo que rendem por hora, pelo P.A. e pelo ticket) e o que reduzir ou pausar, com as horas que voltam para os 2 canais. O mesmo olhar vale para o estoque: poucas categorias com foco (as que giram e trazem margem), em vez de tudo ao mesmo tempo. Muito trabalho espalhado com resultado baixo é o problema a resolver: diga isso com os números.$txt$))
where chave = 'leitura_agente' and dados->>'instrucoes' not like '%FOCO DE ENERGIA%';
