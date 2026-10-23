-- Portal com mais de uma loja (ex.: feminino e masculino): as lojas do portal e de qual loja é cada item.
-- Item sem loja = vale para todas as lojas do portal.
alter table public.portais add column if not exists lojas text[] not null default '{}';
alter table public.consultoria_entregas add column if not exists loja text;
alter table public.consultoria_acoes add column if not exists loja text;
alter table public.loja_equipe add column if not exists loja text;
