-- Agente da Análise do Perfil: antes de sugerir conteúdo, identificar o modelo da loja e usar o que o Diagnóstico já sabe.
-- Nasceu da revisão da Traz (brechó), que tinha recebido ideias de multimarca (grade, reposição, coleção).
-- A versão anterior das instruções fica no histórico.
set lock_timeout = '8s';
update metodo set dados = jsonb_set(
  jsonb_set(dados, '{historico}', (jsonb_build_array(jsonb_build_object('instrucoes', dados->>'instrucoes', 'em', now(), 'por', 'Modelo da loja (revisão da Traz)')) || coalesce(dados->'historico', '[]'::jsonb))),
  '{instrucoes}', to_jsonb((dados->>'instrucoes') || E'\n\n' ||
'MODELO DA LOJA (faça isto antes de qualquer sugestão)
- Identifique o modelo da loja pelos dados e pelo contexto do Diagnóstico: multimarca (compra com representante e showroom, tem grade e reposição), brechó ou outlet (peça única, sem grade, estoque que vem de fornecedoras e de clientes que vendem as peças delas), marca própria, moda praia, fitness, plus size, infantil e assim por diante. Escreva o modelo em "nicho" (ex.: "Brechó e outlet de moda feminina (peça única)"), nunca um genérico como "Multimarca de Moda" se não for.
- Tudo o que você sugere tem de existir nesse modelo. Brechó e outlet: nada de grade, reposição, coleção, "últimas unidades" ou contagem para lançamento de fornecedor. No lugar: marca, tamanho e preço no gancho; achado e garimpo; peça única com hora marcada para vender (drop com dia e horário fixos, live como evento); foto e vídeo em lote com padrão fixo; reaproveitar o formato, não a peça; o cuidado com a peça (do saco à arara); conteúdo para quem quer vender as próprias peças para a loja.
- Use o contexto do Diagnóstico quando vier: o gargalo e a alavanca escolhidos pela Camilla, os números da loja, a cidade, os canais e a pesquisa de concorrentes e mercado. O conteúdo tem de servir ao gargalo e à alavanca, não brigar com eles.
- Cadência: parta do que a loja faz hoje. Se ela já posta demais (ex.: dezenas de conteúdos por dia), a sugestão é postar menos e melhor (1 reel forte por dia + stories), não aumentar.
- Cidade e cliente: só use "quem está passando pela cidade" quando a loja for de cidade de passagem. Se a loja for difícil de achar, mostre como chegar. Nada de "look de casal" em loja só feminina.
- Se o perfil não trouxe posts nem prints, diga isso nas pendências e não preencha a análise de posts com suposição.')
)
where chave = 'analise_agente' and position('MODELO DA LOJA (faça isto' in dados->>'instrucoes') = 0;
