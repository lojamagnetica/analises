-- Relatório de Perfil Comportamental: a pessoa da equipe abre o próprio resultado por um link, sem login.
-- O link carrega loja_equipe.retorno_token (criado pela loja ao enviar o relatório).
alter table public.loja_equipe add column if not exists retorno_token uuid unique;

create or replace function public.perfil_relatorio(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', split_part(e.nome, ' ', 1),
    'funcao', e.funcao,
    'loja', coalesce(e.loja, p.loja),
    'perfil', e.perfil,
    'perfil_em', e.perfil_em)
  from public.loja_equipe e join public.portais p on p.id = e.portal_id
  where p_token is not null and e.retorno_token = p_token and e.perfil is not null
$$;
revoke execute on function public.perfil_relatorio(uuid) from public;
grant execute on function public.perfil_relatorio(uuid) to anon, authenticated;
