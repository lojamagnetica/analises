-- Plano de Ação: além dos meses 1, 2 e 3, o mês 4 é o bônus da revisão de 90 dias.
set lock_timeout = '8s';
alter table public.plano_itens drop constraint if exists plano_itens_mes_check;
alter table public.plano_itens add constraint plano_itens_mes_check check (mes between 1 and 4);
