-- Painel dos portais: em que fase cada loja está (lojista já tem acesso = acompanhamento),
-- o status da entrega do portal (em preparação ou entregue) e a ordem de prioridade das que já têm acesso.
set lock_timeout = '8s';
alter table public.portais add column if not exists acesso_liberado boolean not null default false;
alter table public.portais add column if not exists entrega text not null default 'preparacao';
alter table public.portais add column if not exists prioridade int;
alter table public.portais drop constraint if exists portais_entrega_check;
alter table public.portais add constraint portais_entrega_check check (entrega in ('preparacao', 'entregue'));
