-- Regra do método: aniversariantes do mês. O presente vale o mês inteiro do aniversário. São 3 mensagens, da
-- consultora para a própria carteira: convite no dia 1 do mês até 12h (para todas), parabéns no dia pela manhã
-- (quem já usou o presente recebe só o parabéns) e lembrete 5 dias antes do fim do mês (só para quem não usou).
-- A gestora puxa a lista no dia 25 do mês anterior e divide pela carteira de cada vendedora.
update metodo set dados = jsonb_set(dados, '{campanhas}', (
  select jsonb_agg(case when c->>'nome' = 'Aniversariante do mês'
    then c || '{"quando": "Lista no dia 25 do mês anterior; convite no dia 1, até 12h", "como": "O presente vale o mês inteiro. 3 mensagens da consultora para a própria carteira: convite no dia 1 até 12h (para todas), parabéns no dia pela manhã (quem já usou recebe só o parabéns) e lembrete 5 dias antes do fim do mês (só para quem não usou). Na loja: conferir a data no sistema, entregar na embalagem de presente e atualizar o cadastro."}'::jsonb
    else c end)
  from jsonb_array_elements(dados->'campanhas') c))
where chave = 'clientes';

update metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb((dados->>'instrucoes') || E'\n\nRegra do método (aniversariantes do mês): o presente vale o mês inteiro. 3 mensagens da consultora para a própria carteira: convite no dia 1 até 12h, parabéns no dia e lembrete 5 dias antes do fim do mês só para quem ainda não usou.'))
where chave = 'leitura_agente' and position('aniversariantes do mês' in dados->>'instrucoes') = 0;
