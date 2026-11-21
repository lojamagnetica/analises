-- A missão da semana do time sai da análise: o agente sugere foco, quem chamar, a mensagem e a meta;
-- a loja vê a sugestão na Missão da semana depois que a Camilla publica a análise.
set lock_timeout = '8s';
update public.metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb((dados->>'instrucoes') || $txt$

MISSÃO DA SEMANA DO TIME ("missao")
A missão de CRM da semana, igual para o time todo, sai do principal ponto da análise (ex.: se o ponto é o combo, a missão é chamar as clientes da carteira para o combo).
- "foco": nome curto da missão (ex.: "Combo da quinzena").
- "criterio": quem cada pessoa chama na própria carteira (o time puxa no sistema), ex.: "as clientes que compraram sutiã nos últimos 6 meses".
- "mensagem": o modelo, com {nome} (cliente), {consultora} (quem manda) e {loja}, nas regras do método: diz quem fala, conduz com duas opções no fim, nada de "posso?" ou "quer ver?". Use os produtos e números dos relatórios. Sem Natal antes de dezembro.
- "meta": quantas clientes cada pessoa chama na semana (entre 10 e 20; menos para quem está começando).
A loja vê essa missão sugerida na Missão da semana depois que a Camilla publicar a análise.$txt$))
where chave = 'leitura_agente' and dados->>'instrucoes' not like '%MISSÃO DA SEMANA DO TIME%';
