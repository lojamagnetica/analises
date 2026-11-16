-- Natal só a partir de 1º de dezembro (mesmo que esteja no plano); ação com desconto que a loja contou (live, pré-Black)
-- explica o desconto e o ticket mais baixo: não é erro de atendimento.
set lock_timeout = '8s';
update public.metodo set dados = jsonb_set(dados, '{instrucoes}', to_jsonb(replace(dados->>'instrucoes',
 'Em novembro ainda não é período de falar de presente de Natal: não sugira "presente de Natal" antes de dezembro.',
 'Natal só a partir de 1º de dezembro, mesmo que já esteja no plano do mês: antes disso, não fale de "presente de Natal", "arara de Natal" nem "vender como presente de Natal".
Se a loja contou (no Fale com a Camilla ou na conversa) que teve uma ação com desconto na semana, como live ou pré-Black, o desconto e o ticket mais baixo vêm da ação: não trate como erro de atendimento.')))
where chave = 'leitura_agente';
