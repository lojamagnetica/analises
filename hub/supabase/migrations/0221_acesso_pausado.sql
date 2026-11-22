-- Acesso pausado: enquanto a equipe termina o Hub de uma loja, a loja não vê nada (a equipe vê tudo).
-- Para liberar: update portais set acesso_pausado = false where id = '...';
alter table public.portais add column if not exists acesso_pausado boolean not null default false;

create or replace function public.pode_ver(p uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select public.is_equipe() or (p is not null and p = public.meu_portal() and not public.so_caixa()
    and not coalesce((select acesso_pausado from public.portais where id = p), false))
$function$;

create or replace function public.pode_caixa(p uuid)
 returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select public.is_equipe() or (p is not null and p = public.meu_portal()
    and not coalesce((select acesso_pausado from public.portais where id = p), false))
$function$;
