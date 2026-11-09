-- Segmento da loja: adapta os textos da rotina da gestão (vazio = loja de roupa; "tecidos" = loja de tecidos).
-- Quem é de tecidos é marcado direto no banco, fora do repositório.
set lock_timeout = '8s';
alter table public.portais add column if not exists segmento text;
