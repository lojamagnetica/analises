-- Agente do Diagnóstico: não perguntar o que a loja já respondeu (formulário, áudios, anotações, arquivos).
-- A versão anterior das instruções fica no histórico.
set lock_timeout = '8s';
update metodo set dados = jsonb_set(
  jsonb_set(dados, '{historico}', (jsonb_build_array(jsonb_build_object('instrucoes', dados->>'instrucoes', 'em', now(), 'por', 'Ajuste após o teste da Traz')) || coalesce(dados->'historico', '[]'::jsonb))),
  '{instrucoes}', to_jsonb(replace(dados->>'instrucoes', 'elas viram perguntas.',
    'elas viram perguntas.' || E'\n' ||
    '- Nunca pergunte o que a loja já respondeu. Antes de pôr qualquer item em "faltando", nas inconsistências ou nas perguntas do gargalo, procure a resposta em todo o material: formulário de diagnóstico, transcrições de áudio e de reunião, anotações, planner, arquivos e dados do Hub. Se a resposta já existe, use o dado com a fonte e não pergunte. Se está só em parte, diga o que já se sabe e pergunte só o pedaço que falta (ex.: "ela citou cerca de seis sacolas; falta saber quantos dias a peça leva da avaliação até a arara"). A dona não pode sentir que não foi ouvida.'))
)
where chave = 'diagnostico_agente' and position('Nunca pergunte o que a loja já respondeu' in dados->>'instrucoes') = 0;
