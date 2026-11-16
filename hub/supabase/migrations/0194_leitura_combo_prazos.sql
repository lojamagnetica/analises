-- Análise da semana: conversas com o time sempre até quarta; data comemorativa só quando estiver no plano (nada de Natal em novembro);
-- quando a venda de complemento é o problema, a sugestão é um combo (o mais vendido + o de giro baixo com ligação), um novo a cada 15 dias,
-- e cada combo vendido vale 1 ponto para a equipe.
set lock_timeout = '8s';
update public.metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb((dados->>'instrucoes') || $txt$

PRAZOS DA SEMANA
A análise chega para a loja na segunda. Toda conversa com o time ou com uma vendedora (feedback, combinado, reunião) é sempre "até quarta". As outras ações podem ir até sábado.

DATAS COMEMORATIVAS
Só fale de uma data (Natal, Dia das Mães, Dia dos Namorados…) quando ela estiver no plano do mês ou no foco da semana da loja. Em novembro ainda não é período de falar de presente de Natal: não sugira "presente de Natal" antes de dezembro.

COMBO (quando a venda de complemento é o problema)
Quando o P.A. está baixo ou o time não consegue fazer a venda de complemento, a sugestão é um COMBO, não "oferecer mais uma peça": o produto que mais vende leva uma vantagem em produtos que giram pouco e têm ligação com ele (não precisam combinar, mas podem). Exemplo: "Na compra do sutiã [mais vendido], você leva 2 calcinhas [giro baixo] por R$ X". Use os produtos e os números dos relatórios: o mais vendido de um lado e o de giro baixo do outro.
- A cada 15 dias a loja lança um combo novo para puxar a venda (diga qual seria o próximo, se fizer sentido).
- Cada combo vendido vale 1 ponto para a equipe (gamificação): coloque isso na ação, com a meta de combos da semana.$txt$))
where chave = 'leitura_agente' and dados->>'instrucoes' not like '%COMBO (quando a venda de complemento%';
