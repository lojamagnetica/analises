-- Sem o termo "balcão" nos textos do curso (remete a loja popular).
update curso_modulos set promessa = 'Uma equipe que vende mesmo quando você não está na loja' where id = 'm02';
update curso_aulas set topicos = array_replace(topicos,
  'Do dono operador (apaga incêndio no balcão) ao dono gestor (cria o processo e cobra o processo)',
  'Do dono operador (apaga incêndio no dia a dia) ao dono gestor (cria o processo e cobra o processo)')
where codigo = '0.1';
