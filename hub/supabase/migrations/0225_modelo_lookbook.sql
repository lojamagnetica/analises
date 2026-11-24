-- Modelo "Lookbook editorial" no Montador de carrossel (Multimarca e Multimarca feminina), em rascunho.
-- Formatos novos: abertura, ficha (ficha do look, numerada) e enquete.
insert into modelos_mes (mes, segmento, ordem, nome, descricao, referencia_url, referencia_perfil, referencia_data, slides, liberado)
select '2026-11', seg, ordem, 'Lookbook editorial · 3 looks e uma enquete',
  'Uma peça protagonista em três looks, com cara de revista: capa, uma ficha para cada look (número grande, detalhes, a peça sozinha e o texto) e a enquete para a cliente comentar 1, 2 ou 3. Ótimo para chegada de coleção ou de marca nova. Fotos: o look no corpo e a peça sozinha (de preferência em fundo branco).',
  'https://www.instagram.com/p/Df97xpKIIxu/', 'post de referência', '2026-11-21',
  '[
    {"tipo":"abertura","kic":"Looks do momento","tit":"O jeans é o momento!","pre":"Três propostas, três personalidades e uma peça protagonista.","dica":"Capa: foto com os 3 looks juntos e o título da peça protagonista"},
    {"tipo":"ficha","kic":"Nome da loja · marca","tit":"Cinto corset | Broches removíveis","pre":"O jeans ganha destaque com o cinto que marca a cintura. | Os broches dão charme e deixam a produção única.","dica":"Look 1: foto do look no corpo + a peça sozinha, com 2 detalhes"},
    {"tipo":"ficha","kic":"Nome da loja · marca","tit":"Gola alta | Perna ajustada","pre":"Inspirado na alfaiataria, o conjunto une elegância e o jeans do dia a dia. | Cintura marcada e detalhes que valorizam o corpo.","dica":"Look 2: foto do look no corpo + a peça sozinha, com 2 detalhes"},
    {"tipo":"ficha","kic":"Nome da loja · marca","tit":"Calça balloon | Lavagem escura","pre":"A jardineira ganha uma releitura atual com a modelagem balloon. | O volume e a lavagem escura trazem atitude a um clássico.","dica":"Look 3: foto do look no corpo + a peça sozinha, com 2 detalhes"},
    {"tipo":"enquete","kic":"Looks do momento","tit":"Qual é o seu look do momento?","pre":"*Romântico, sofisticado ou descomplicado:* comenta 1, 2 ou 3.","dica":"Enquete: a cliente escolhe o look nos comentários"}
  ]'::jsonb, false
from (values ('Multimarca', 9), ('Multimarca feminina', 7)) v(seg, ordem)
where not exists (select 1 from modelos_mes m where m.mes = '2026-11' and m.segmento = v.seg and m.nome = 'Lookbook editorial · 3 looks e uma enquete');
