-- Quais lojas já estão no acompanhamento da CS (portal ok e já passado pela reunião de entrega).
-- As demais aparecem só em "A caminho do acompanhamento" até a gestora passar a loja. Quem entra é definido no banco, não aqui.
set lock_timeout = '8s';
alter table public.portais add column if not exists cs_acompanha boolean not null default false;
