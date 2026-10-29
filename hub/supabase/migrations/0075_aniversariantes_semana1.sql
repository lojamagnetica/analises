-- Ajuste da regra dos aniversariantes do mês (Camilla):
-- convite na PRIMEIRA SEMANA do mês para todas as aniversariantes; no dia, SÓ o parabéns (a mensagem se perde no
-- meio de tantas, não vale tentar vender); faltando 5 dias para o presente expirar, o lembrete.
update metodo set dados = jsonb_set(dados, '{campanhas}', (
  select jsonb_agg(case when c->>'nome' = 'Aniversariante do mês'
    then c || '{"quando": "Lista no dia 25 do mês anterior; convite na primeira semana do mês", "como": "O presente vale o mês inteiro (ex.: x% de desconto nas compras do mês). 3 mensagens da consultora para a própria carteira: convite na primeira semana para todas (\"Este é o mês do seu aniversário e nós da loja preparamos um presente especial para você... Já vamos escolher o look do seu dia? Será um privilégio te ajudar nessa escolha.\"), só o parabéns no dia (sem falar do presente: no dia chegam muitas mensagens e não é hora de vender) e o lembrete faltando 5 dias para expirar."}'::jsonb
    else c end)
  from jsonb_array_elements(dados->'campanhas') c))
where chave = 'clientes';

update metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb(replace(dados->>'instrucoes',
  'Regra do método (aniversariantes do mês): o presente vale o mês inteiro. 3 mensagens da consultora para a própria carteira: convite no dia 1 até 12h, parabéns no dia e lembrete 5 dias antes do fim do mês só para quem ainda não usou.',
  'Regra do método (aniversariantes do mês): o presente vale o mês inteiro. 3 mensagens da consultora para a própria carteira: convite na primeira semana do mês para todas as aniversariantes, só o parabéns no dia (sem falar do presente: não é hora de vender) e o lembrete faltando 5 dias para o presente expirar.')))
where chave = 'leitura_agente';

-- Cronograma: os planners que já existem ganham as duas demandas do aniversário (sem mexer no resto).
update loja_planner set blocos = blocos || $j$[
  {"id": "aniv0001", "freq": "mensal", "dia": 1, "frente": "Varejo", "titulo": "Aniversariantes do mês: o convite", "detalhe": "Primeira semana do mês, para todas as aniversariantes", "como": "Lançar a missão Aniversariantes do mês para o time\nCada vendedora manda o convite para as clientes da carteira dela (o presente vale o mês inteiro)\nNo dia de cada uma: só o parabéns, sem falar do presente", "quem": ""},
  {"id": "aniv0025", "freq": "mensal", "dia": 25, "frente": "Varejo", "titulo": "Aniversariantes: lembrete e a lista do mês seguinte", "detalhe": "", "como": "Lembrete para quem ainda não usou o presente (faltam 5 dias para expirar)\nPuxar no sistema as aniversariantes do mês seguinte e dividir pela carteira de cada vendedora", "quem": ""}
]$j$::jsonb, updated_at = now()
where not blocos::text like '%aniv0001%';
