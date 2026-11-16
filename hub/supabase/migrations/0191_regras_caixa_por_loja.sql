-- As Regras do caixa só aparecem nas lojas com formas de pagamento com particularidades (hoje, só a Schiê).
set lock_timeout = '8s';
alter table public.portais add column if not exists regras_caixa boolean not null default false;
comment on column public.portais.regras_caixa is 'A loja tem formas de pagamento com particularidades: mostra as Regras do caixa no Fechamento de caixa.';
-- (o portal que liga as regras fica só no banco: dado de cliente não vai para o repositório)
