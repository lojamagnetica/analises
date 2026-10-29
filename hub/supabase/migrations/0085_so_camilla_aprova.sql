-- Nestes primeiros meses, montar, editar e liberar o que vai para a loja é só da Camilla (quem aprova).
-- O resto da equipe só vê o que já foi liberado, como a loja vê. Modelos de contrato continuam com a equipe (Claudia).
-- Agentes e funções do servidor (sem login) seguem como antes.

-- Diagnóstico, Gestão estratégica e Análise do Instagram.
drop policy if exists diagnostico_equipe on public.loja_diagnostico;
drop policy if exists diagnostico_ler on public.loja_diagnostico;
create policy diagnostico_mentora on public.loja_diagnostico for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());
create policy diagnostico_ler on public.loja_diagnostico for select using (status = 'liberada' and public.pode_ver(portal_id));

drop policy if exists gestao_equipe on public.loja_gestao;
drop policy if exists gestao_ler on public.loja_gestao;
create policy gestao_mentora on public.loja_gestao for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());
create policy gestao_ler on public.loja_gestao for select using (status = 'liberada' and public.pode_ver(portal_id));

drop policy if exists analise_equipe on public.loja_analise_perfil;
create policy analise_mentora on public.loja_analise_perfil for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());

drop policy if exists extra_equipe on public.loja_analise_extra;
drop policy if exists extra_ler on public.loja_analise_extra;
create policy extra_mentora on public.loja_analise_extra for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());
create policy extra_ler on public.loja_analise_extra for select using (status = 'liberada' and public.pode_ver(portal_id));

-- Materiais da consultoria.
drop policy if exists materiais_equipe on public.consultoria_materiais;
drop policy if exists materiais_ler on public.consultoria_materiais;
create policy materiais_mentora on public.consultoria_materiais for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());
create policy materiais_ler on public.consultoria_materiais for select using (liberado and public.pode_ver(portal_id));

-- Ações do Mês, Gincanas e Pautas quentes (para todas as lojas).
drop policy if exists acoes_equipe on public.acoes;
drop policy if exists acoes_ler on public.acoes;
create policy acoes_mentora on public.acoes for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());
create policy acoes_ler on public.acoes for select using (publicada);

drop policy if exists gincanas_equipe on public.gincanas;
drop policy if exists gincanas_ler on public.gincanas;
create policy gincanas_mentora on public.gincanas for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());
create policy gincanas_ler on public.gincanas for select using (publicada);

drop policy if exists pautas_equipe on public.pautas;
create policy pautas_mentora on public.pautas for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());

-- O método (mensagens, campanhas, instruções dos agentes): todos leem, só a Camilla muda.
drop policy if exists metodo_equipe on public.metodo;
create policy metodo_mentora on public.metodo for all to authenticated using (public.pode_aprovar()) with check (public.pode_aprovar());

-- Planner e organograma: a loja usa (marca o que fez), mas liberar é só da Camilla.
create or replace function public.liberar_so_quem_aprova() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.pode_aprovar() then return new; end if;
  if new.liberado and (tg_op = 'INSERT' or not coalesce(old.liberado, false)) then
    raise exception 'Só a Camilla libera para a loja.';
  end if;
  return new;
end $$;
drop trigger if exists planner_so_quem_aprova on public.loja_planner;
create trigger planner_so_quem_aprova before insert or update on public.loja_planner for each row execute function public.liberar_so_quem_aprova();
drop trigger if exists organograma_so_quem_aprova on public.loja_organograma;
create trigger organograma_so_quem_aprova before insert or update on public.loja_organograma for each row execute function public.liberar_so_quem_aprova();

-- Plano do mês: a loja monta e envia; aprovar ou pedir ajuste é só da Camilla.
create or replace function public.plano_mes_so_quem_aprova() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_equipe() or public.pode_aprovar() then return new; end if;
  if new.status in ('ok', 'ajustar') and new.status is distinct from (case when tg_op = 'UPDATE' then old.status end) then
    raise exception 'Só a Camilla aprova o plano do mês.';
  end if;
  return new;
end $$;
drop trigger if exists plano_mes_so_quem_aprova on public.loja_plano_mes;
create trigger plano_mes_so_quem_aprova before insert or update on public.loja_plano_mes for each row execute function public.plano_mes_so_quem_aprova();
