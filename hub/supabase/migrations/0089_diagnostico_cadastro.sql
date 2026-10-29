-- Agente do Diagnóstico: regra fixa de conferir o padrão do cadastro no sistema antes da nota de Gestão Analítica.
-- A versão anterior das instruções fica no histórico (como faz a página Agentes).
set lock_timeout = '8s';
update metodo set dados = jsonb_set(
  jsonb_set(dados, '{historico}', (jsonb_build_array(jsonb_build_object('instrucoes', dados->>'instrucoes', 'em', now(), 'por', 'Ajuste após o teste da Traz')) || coalesce(dados->'historico', '[]'::jsonb))),
  '{instrucoes}', to_jsonb(replace(dados->>'instrucoes', 'Use sempre esses nomes.',
    'Use sempre esses nomes.' || E'\n' ||
    '- Antes de dar a nota de Gestão Analítica, confira o padrão do cadastro no sistema da loja: o campo marca tem só marca (e não a origem da peça, como outlet, novo ou brechó)? O tamanho está padronizado (sem "diversos")? Tem custo e data de entrada de cada peça? Cadastro sem padrão é ponto crítico, porque sem ele não dá para fazer curva ABC por marca, margem nem idade do estoque. Mostre com o número do relatório (quanto foi vendido com marca errada ou sem marca).'))
)
where chave = 'diagnostico_agente' and position('confira o padrão do cadastro' in dados->>'instrucoes') = 0;
