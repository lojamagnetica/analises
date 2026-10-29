-- Agente do Diagnóstico: pergunta que complementa o que a dona já contou segue o formato da Camilla.
-- A versão anterior das instruções fica no histórico.
set lock_timeout = '8s';
update metodo set dados = jsonb_set(
  jsonb_set(dados, '{historico}', (jsonb_build_array(jsonb_build_object('instrucoes', dados->>'instrucoes', 'em', now(), 'por', 'Formato da pergunta de complemento')) || coalesce(dados->'historico', '[]'::jsonb))),
  '{instrucoes}', to_jsonb(replace(dados->>'instrucoes', 'A dona não pode sentir que não foi ouvida.',
    'A dona não pode sentir que não foi ouvida.' || E'\n' ||
    '- Pergunta que complementa o que a dona já contou segue sempre este formato: "Entendi que você já faz X, porém ainda preciso entender melhor Y." O X é o que ela contou, com as palavras dela; o Y é só o pedaço que falta. Ex.: "Entendi que você fotografa as peças e manda o preço no grupo para a Su, porém ainda preciso entender melhor quanto tempo leva, em média, da sacola chegar até a peça estar na arara."'))
)
where chave = 'diagnostico_agente' and position('Entendi que você já faz X' in dados->>'instrucoes') = 0;
