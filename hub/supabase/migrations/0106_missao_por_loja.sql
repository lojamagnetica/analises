-- Missão da semana por loja: em portais com mais de uma loja, cada loja tem a sua missão na mesma semana.
-- loja = '' é a missão do portal inteiro (portais de uma loja só).
alter table public.loja_missoes add column if not exists loja text not null default '';
alter table public.loja_missoes drop constraint if exists loja_missoes_portal_id_semana_key;
alter table public.loja_missoes add constraint loja_missoes_portal_semana_loja_key unique (portal_id, semana, loja);
