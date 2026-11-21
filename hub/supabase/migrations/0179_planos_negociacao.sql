-- Valores da negociação em cada plano: o valor de tabela (já existia em valor), até quanto pode fechar
-- e a duração para quem fecha na call. A equipe comercial vê isso nos Leads e em Registrar venda.
set lock_timeout = '8s';

alter table public.planos add column if not exists valor_fecha numeric(12, 2);
alter table public.planos add column if not exists meses_call integer;
comment on column public.planos.valor_fecha is 'Até quanto o plano pode fechar na negociação (vazio = só o valor de tabela).';
comment on column public.planos.meses_call is 'Duração em meses para quem fecha na call, pelo mesmo valor (vazio = a duração normal).';

-- Premium: R$ 18 mil, fecha até R$ 15 mil. Gold: R$ 12 mil, fecha até R$ 9 mil.
update public.planos set valor_fecha = 15000 where id = 'premium';
update public.planos set valor_fecha = 9000 where id = 'gold';
-- Start (4 meses): R$ 8 mil; quem fecha na call leva 6 meses pelo mesmo valor.
update public.planos set valor = 8000, meses_call = 6 where id = 'start';
