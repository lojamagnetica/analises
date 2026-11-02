-- Reuniões de gestão dos donos: análise do mês que fechou e planejamento do mês seguinte (Minha consultoria).
set lock_timeout = '8s';
alter table public.loja_reunioes drop constraint if exists loja_reunioes_tipo_check;
alter table public.loja_reunioes add constraint loja_reunioes_tipo_check
  check (tipo in ('semanal', 'mensal', 'abertura', 'reta_final', 'individual', 'analise', 'planejamento'));
