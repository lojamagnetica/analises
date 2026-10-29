-- Modelos de reunião prontos: além da semanal e da mensal, a de abertura, a de reta final e a individual.
alter table public.loja_reunioes drop constraint if exists loja_reunioes_tipo_check;
alter table public.loja_reunioes add constraint loja_reunioes_tipo_check
  check (tipo in ('semanal', 'mensal', 'abertura', 'reta_final', 'individual'));
