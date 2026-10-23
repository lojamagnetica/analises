-- Cada pessoa pode trocar o próprio nome de exibição (a tabela perfis só a equipe altera).
create function public.salvar_meu_nome(novo text) returns void
language sql security definer set search_path = public as $$
  update public.perfis set nome = left(trim(novo), 120) where id = auth.uid() and length(trim(novo)) > 0
$$;
revoke execute on function public.salvar_meu_nome(text) from public, anon;
grant execute on function public.salvar_meu_nome(text) to authenticated;
