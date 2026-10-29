-- Regra do método: no CRM, a chamada para ação conduz e direciona o atendimento. Nada de palavras de dúvida
-- ("posso...?", "quer ver?", "se quiser"): duas opções que levam ao próximo passo
-- ("te mando as fotos ou você já consegue vir na loja ver tudo e provar?").
update metodo set dados = jsonb_set(dados, '{tipos}', (
  select jsonb_object_agg(k, jsonb_set(v, '{mensagem}', to_jsonb(case k
    when 'VIP' then 'Oi, {nome}! Aqui é {consultora}, da {loja}. Você é uma cliente muito especial para nós, por isso quero te mostrar a coleção nova antes de todo mundo. Vou reservar um horário só para você esta semana: fica melhor no começo ou no fim da semana?'
    when 'Nova' then 'Oi, {nome}! Aqui é {consultora}, da {loja}. Lembrei de você: chegaram peças que combinam com o que você levou. Te mando as fotos agora ou você já consegue vir na loja provar?'
    when 'Sumida' then 'Oi, {nome}! Aqui é {consultora}, da {loja}. Que saudade de você por aqui! A loja está cheia de novidades e tem um presente esperando por você na sua próxima visita. Você consegue vir ainda esta semana ou fica melhor na próxima?'
    when 'Em risco' then 'Oi, {nome}! Aqui é {consultora}, da {loja}. Lembrei de você quando chegou a coleção nova e separei umas peças que são a sua cara: te mando as fotos agora ou você já consegue vir na loja provar?'
    when 'Recorrente' then 'Oi, {nome}! Aqui é {consultora}, da {loja}. Chegaram peças novas com a sua cara e eu já separei algumas no seu tamanho: te mando as fotos agora ou você já consegue vir na loja provar?'
    else v->>'mensagem' end)))
  from jsonb_each(dados->'tipos') e(k, v)))
where chave = 'clientes';

update metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb((dados->>'instrucoes') || E'\n\nRegra do método (chamada para ação no CRM): a mensagem conduz e direciona o atendimento. Nada de palavras de dúvida ("posso...?", "quer ver?", "se quiser"): duas opções que levam ao próximo passo, como "te mando as fotos ou você já consegue vir na loja ver tudo e provar?".'))
where chave = 'leitura_agente' and position('chamada para ação no CRM' in dados->>'instrucoes') = 0;
