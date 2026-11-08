-- Fundamentos do Método por loja em 3 situações: ainda não, trabalhando agora (fundamentos_trabalhando) e implantado (fundamentos).
-- O placar (x de 16) conta só os implantados.
set lock_timeout = '8s';
alter table public.fichas add column if not exists fundamentos_trabalhando text[] not null default '{}';
