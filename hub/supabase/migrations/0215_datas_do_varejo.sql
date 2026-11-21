-- Calendário do varejo: datas que faltavam e o dia do início do outono.
-- As datas que mudam de dia todo ano (Carnaval, Páscoa, Corpus Christi, Mães, Pais, Black Friday, volta às aulas)
-- ganham o dia certo no Hub (lib/calendario-varejo.ts); Corpus Christi fica em junho e o Hub move para maio quando cai lá.
set lock_timeout='8s';
update datas_comerciais set dia = 20 where mes = 2 and titulo = 'Início do outono' and dia is null;
insert into datas_comerciais (mes, dia, titulo)
select v.mes, v.dia, v.titulo from (values (5, null::int, 'Corpus Christi'), (5, 21, 'Início do inverno'), (11, 24, 'Véspera de Natal')) v(mes, dia, titulo)
where not exists (select 1 from datas_comerciais d where d.titulo = v.titulo);
