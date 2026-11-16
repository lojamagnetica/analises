-- O alerta "mensagem de direção do dia" no painel da CS só aparece depois que a Camilla libera a loja
-- (quando o time da loja já usa o Hub). Até lá, a Claudia não cobra.
set lock_timeout = '8s';
alter table public.portais add column if not exists direcao_cs boolean not null default false;
comment on column public.portais.direcao_cs is 'A Camilla liberou o alerta da mensagem de direção do dia no painel da CS (quando o time da loja já usa o Hub).';
