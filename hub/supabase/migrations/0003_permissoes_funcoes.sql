-- Funções internas não ficam expostas para quem não está logado (recomendação do Supabase).
revoke execute on function public.criar_perfil() from public, anon, authenticated;
revoke execute on function public.is_equipe() from public, anon;
revoke execute on function public.meu_portal() from public, anon;
revoke execute on function public.pode_ver(uuid) from public, anon;
revoke execute on function public.registrar_acesso() from public, anon;
grant execute on function public.is_equipe(), public.meu_portal(), public.pode_ver(uuid), public.registrar_acesso() to authenticated;
