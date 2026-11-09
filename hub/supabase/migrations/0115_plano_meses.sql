-- Quantos meses tem o Plano de Ação desta loja (ex.: Start com prazo estendido). Vazio = o padrão do plano.
set lock_timeout = '8s';
alter table public.portais add column if not exists plano_meses int;
comment on column public.portais.plano_meses is 'Meses do Plano de Ação desta loja quando foge do padrão do plano (ex.: 5). Vazio = padrão.';
