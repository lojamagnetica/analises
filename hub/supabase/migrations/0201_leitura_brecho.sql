-- Análise da semana em brechó: peça única (reposição = curadoria), giro por categoria e idade da peça,
-- própria x consignada (margem), entrada x saída e look completo para subir o ticket.
set lock_timeout = '8s';
update public.metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb((dados->>'instrucoes') || $txt$

BRECHÓ (quando a loja é brechó: o nome ou os dados da loja dizem)
- Cada peça é única: não existe "repor a mesma peça". Reposição em brechó é curadoria: trazer mais peças das categorias, tamanhos e faixas de preço que giram, e menos das que param.
- Giro em brechó se mede por categoria: quanto do estoque daquela categoria saiu na semana (%) e há quanto tempo as peças estão na loja (idade, pela data de entrada). Peça com mais de 60 dias na arara pede movimento urgente (look montado na entrada, stories, combo, foco do time), sempre dizendo qual.
- Separe peça própria de peça consignada (fornecedor/repasse): a margem é diferente (própria 100%, consignada 60% a 70%). Vender mais peça própria sobe o resultado da loja; diga quanto da venda foi consignada.
- Compare o que entrou na semana (peças cadastradas, garimpo) com o que saiu: estoque que só cresce sem girar pesa.
- Ticket e P.A. em brechó: a peça média é mais baixa, então o look completo (2 a 3 peças) é o que sobe o ticket.$txt$))
where chave = 'leitura_agente' and dados->>'instrucoes' not like '%BRECHÓ (quando a loja é brechó%';
