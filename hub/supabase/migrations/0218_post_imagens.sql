-- Imagens prontas do post (campanha): a loja baixa no celular e posta sem alterar nada.
-- Lista de { path, nome } no balde "relatorios", pasta <portal>/posts/<post>/.
alter table public.loja_posts add column if not exists imagens jsonb not null default '[]'::jsonb;
