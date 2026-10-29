-- Regra do método: o pós-venda é o carimbo de conexão. Em até 24 horas depois do atendimento, sem oferecer nada:
-- a cliente, ainda conectada pelo atendimento, responde e salva o número da consultora. A próxima tentativa de venda
-- vem dentro de 30 dias. Ser interessante antes de ser interesseiro.

-- Campanha "Segunda compra": pós-venda em 24 horas e a sugestão de peças só dentro dos 30 dias.
update metodo set dados = jsonb_set(dados, '{campanhas}', (
  select jsonb_agg(case when c->>'nome' = 'Segunda compra'
    then c || '{"como": "Pós-venda em até 24 horas depois do atendimento, sem oferecer nada (o carimbo de conexão: ela responde e salva o número). Dentro de 30 dias, a sugestão de peças que combinam com o que ela levou."}'::jsonb
    else c end)
  from jsonb_array_elements(dados->'campanhas') c))
where chave = 'clientes';

-- Mensagem das clientes novas: já é a da segunda compra (o pós-venda de 24 horas é feito na hora pela consultora).
update metodo set dados = jsonb_set(dados, '{tipos,Nova,mensagem}',
  to_jsonb('Oi, {nome}! Aqui é {consultora}, da {loja}. Lembrei de você: chegaram peças que combinam com o que você levou. Quer que eu te mande as fotos?'::text))
where chave = 'clientes';

-- A mesma regra para o agente da leitura da semana.
update metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb((dados->>'instrucoes') || E'\n\nRegra do método (pós-venda): o pós-venda é o carimbo de conexão. Acontece em até 24 horas depois do atendimento e não oferece nada: o objetivo é a cliente responder e salvar o número da consultora. A próxima tentativa de venda vem dentro de 30 dias. Ser interessante antes de ser interesseiro.'))
where chave = 'leitura_agente' and position('carimbo de conexão' in dados->>'instrucoes') = 0;
