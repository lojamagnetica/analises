-- Análises e reuniões de gestão em rascunho (dados.validado = false) só a equipe vê, até a Camilla validar.
drop policy if exists reunioes_rascunho_so_equipe on public.loja_reunioes;
create policy reunioes_rascunho_so_equipe on public.loja_reunioes as restrictive for select using (public.is_equipe() or coalesce((dados->>'validado')::boolean, true));
