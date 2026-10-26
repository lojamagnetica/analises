-- Diagnóstico liberado: a mentoria avança sozinha para o passo 3 (Plano de Ação 90 dias), se ainda estiver antes dele.
-- (As mentorias que já estavam com o Diagnóstico liberado foram passadas para o passo 3 à mão, em Portais › Editar.)
create or replace function public.passo_pelo_diagnostico() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'liberada' then
    update public.portais set passo_atual = 3 where id = new.portal_id and passo_atual < 3 and tipo = 'Mentoria';
  end if;
  return new;
end $$;
create or replace trigger passo_pelo_diagnostico after insert or update of status on public.loja_diagnostico
  for each row execute function public.passo_pelo_diagnostico();
