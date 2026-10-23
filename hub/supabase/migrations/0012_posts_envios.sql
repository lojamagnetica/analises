-- A métrica-norte do Método Loja Viral: envios de DM ÷ alcance, por reel.
-- modelo = o roteiro-modelo do post, para descobrir os formatos carro-chefe da loja.
alter table public.loja_posts add column alcance int, add column envios int, add column salvamentos int;
alter table public.loja_posts add column modelo text;
