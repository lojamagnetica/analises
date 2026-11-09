-- Portal com várias lojas: o nome no topo do Início é só o de quem cuida da loja em foco (perfis.loja_padrao).
-- Com as lojas juntas, continua o nome geral do portal.
set lock_timeout = '8s';
create or replace function public.responsaveis_das_lojas(p uuid)
returns table (loja text, nome text)
language sql stable security definer set search_path = public as $$
  select f.loja_padrao, string_agg(coalesce(nullif(trim(f.nome), ''), split_part(f.email, '@', 1)), ' e ' order by f.nome)
  from perfis f where f.portal_id = p and f.loja_padrao is not null and public.pode_ver(p)
  group by f.loja_padrao
$$;
revoke all on function public.responsaveis_das_lojas(uuid) from public, anon;
grant execute on function public.responsaveis_das_lojas(uuid) to authenticated;
