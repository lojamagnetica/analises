-- Foto de perfil: aparece no rodapé do menu, no lugar da inicial.
-- Guardada no próprio perfil como imagem pequena (data URL JPEG, ~256 px), então segue as mesmas regras
-- de leitura do perfil (a pessoa e a equipe) e não fica em nenhum link público.
alter table public.perfis add column foto text;

-- Cada pessoa troca ou remove só a própria foto (a tabela perfis só a equipe altera).
create function public.salvar_minha_foto(nova text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if nova is not null and (left(nova, 23) <> 'data:image/jpeg;base64,' or length(nova) > 300000) then
    raise exception 'foto inválida';
  end if;
  update public.perfis set foto = nova where id = auth.uid();
end;
$$;
revoke execute on function public.salvar_minha_foto(text) from public, anon;
grant execute on function public.salvar_minha_foto(text) to authenticated;
