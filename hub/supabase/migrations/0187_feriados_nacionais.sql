-- Domingo e feriado nacional não contam como caixa faltando (vale para todas as lojas). Se a loja abriu e lançou, vale normal.
-- A mesma regra está no Hub em lib/feriados.ts.
set lock_timeout = '8s';

create or replace function public.feriado_nacional(d date) returns boolean
language plpgsql immutable set search_path = public as $$
declare a int; b int; c int; dd int; e int; f int; g int; h int; i int; k int; l int; m int; mes int; dia int;
begin
  if to_char(d, 'MM-DD') in ('01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25') then return true; end if;
  -- Sexta-feira Santa: dois dias antes da Páscoa (algoritmo de Meeus).
  a := extract(year from d)::int % 19; b := extract(year from d)::int / 100; c := extract(year from d)::int % 100;
  dd := b / 4; e := b % 4; f := (b + 8) / 25; g := (b - f + 1) / 3; h := (19 * a + b - dd - g + 15) % 30;
  i := c / 4; k := c % 4; l := (32 + 2 * e + 2 * i - h - k) % 7; m := (a + 11 * h + 22 * l) / 451;
  mes := (h + l - 7 * m + 114) / 31; dia := ((h + l - 7 * m + 114) % 31) + 1;
  return d = make_date(extract(year from d)::int, mes, dia) - 2;
end $$;

create or replace function public.dia_de_loja(d date) returns boolean
language sql immutable set search_path = public as $$ select extract(isodow from d) <> 7 and not feriado_nacional(d) $$;

-- As três contas do caixa passam a usar o dia de loja (troca só o trecho dos dias; o resto das funções fica igual).
do $do$
declare d text; n text;
begin
  d := pg_get_functiondef('public.caixa_com_problema(public.loja_caixa, boolean)'::regprocedure);
  n := replace(d, 'extract(isodow from k.dia) <> 7', 'dia_de_loja(k.dia)');
  if n = d then raise exception 'caixa_com_problema: trecho não encontrado'; end if;
  execute n;

  d := pg_get_functiondef('public.lembrete_fecha_semana(boolean)'::regprocedure);
  n := replace(d, 'where not exists (select 1 from loja_caixa c', 'where dia_de_loja(d::date) and not exists (select 1 from loja_caixa c');
  if n = d then raise exception 'lembrete_fecha_semana: trecho não encontrado'; end if;
  execute n;

  d := pg_get_functiondef('public.leitura_semana_domingo(boolean)'::regprocedure);
  n := replace(d, 'where not exists (select 1 from loja_caixa c', 'where dia_de_loja(d::date) and not exists (select 1 from loja_caixa c');
  if n = d then raise exception 'leitura_semana_domingo: trecho não encontrado'; end if;
  execute n;
end $do$;
