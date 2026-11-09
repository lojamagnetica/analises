-- CS monta, a Camilla aprova.
-- perfis.monta: quem da equipe prepara diagnósticos, gestão, ações, gincanas e materiais das lojas (a CS).
-- Conteúdo (conteúdo da casa, pautas, análises do Instagram) continua só com quem aprova.
-- Liberar para a loja, publicar e mexer no que já está liberado continua só com quem aprova (a Camilla).
set lock_timeout = '8s';

alter table public.perfis add column if not exists monta boolean not null default false;

create or replace function public.pode_montar() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (p.aprova or p.monta) and p.papel = 'equipe' from perfis p where p.id = auth.uid()), false);
$$;
grant execute on function public.pode_montar() to authenticated;

-- Só quem aprova muda quem monta.
create or replace function public.perfis_aprova_protegido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.aprova is distinct from old.aprova or new.monta is distinct from old.monta) and auth.uid() is not null and not public.pode_aprovar() then
    raise exception 'Só a Camilla muda quem aprova e quem monta.';
  end if;
  return new;
end $$;

-- Quem monta passa a editar as tabelas de diagnóstico, gestão e estratégia.
alter policy diagnostico_mentora on public.loja_diagnostico using (public.pode_montar()) with check (public.pode_montar());
alter policy gestao_mentora on public.loja_gestao using (public.pode_montar()) with check (public.pode_montar());
alter policy materiais_mentora on public.consultoria_materiais using (public.pode_montar()) with check (public.pode_montar());
alter policy acoes_mentora on public.acoes using (public.pode_montar()) with check (public.pode_montar());
alter policy gincanas_mentora on public.gincanas using (public.pode_montar()) with check (public.pode_montar());
alter policy metodo_mentora on public.metodo using (public.pode_montar()) with check (public.pode_montar());
alter policy preparo_mentora on public.diagnostico_preparo using (public.pode_montar()) with check (public.pode_montar());
alter policy caixa_dia_mentora on public.caixa_dia using (public.pode_montar()) with check (public.pode_montar());

-- Diagnóstico e Gestão: liberar para a loja e mexer no que já está liberado é só de quem aprova.
create or replace function public.status_so_quem_aprova() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.pode_aprovar() then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'liberada' then
    raise exception 'Já está liberado para a loja. Para mudar, peça à Camilla para voltar para rascunho.';
  end if;
  if new.status = 'liberada' then raise exception 'Só a Camilla libera para a loja.'; end if;
  return new;
end $$;
drop trigger if exists diagnostico_so_quem_aprova on public.loja_diagnostico;
create trigger diagnostico_so_quem_aprova before insert or update on public.loja_diagnostico for each row execute function public.status_so_quem_aprova();
drop trigger if exists gestao_so_quem_aprova on public.loja_gestao;
create trigger gestao_so_quem_aprova before insert or update on public.loja_gestao for each row execute function public.status_so_quem_aprova();

-- Ações do Mês e gincanas: publicar nos portais e mexer no que já está publicado é só de quem aprova.
create or replace function public.publicar_so_quem_aprova() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.pode_aprovar() then return new; end if;
  if tg_op = 'UPDATE' and old.publicada then
    raise exception 'Já está publicado nos portais. Para mudar, peça à Camilla para despublicar.';
  end if;
  if new.publicada then raise exception 'Só a Camilla publica nos portais.'; end if;
  return new;
end $$;
drop trigger if exists acoes_so_quem_aprova on public.acoes;
create trigger acoes_so_quem_aprova before insert or update on public.acoes for each row execute function public.publicar_so_quem_aprova();
drop trigger if exists gincanas_so_quem_aprova on public.gincanas;
create trigger gincanas_so_quem_aprova before insert or update on public.gincanas for each row execute function public.publicar_so_quem_aprova();

-- Materiais da consultoria: liberar é só de quem aprova (mesma regra do planner e do organograma).
drop trigger if exists materiais_so_quem_aprova on public.consultoria_materiais;
create trigger materiais_so_quem_aprova before insert or update on public.consultoria_materiais for each row execute function public.liberar_so_quem_aprova();

-- Perguntas do gargalo: quem escolhe o gargalo e libera as perguntas é a Camilla.
create or replace function public.perguntas_so_quem_aprova() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.pode_aprovar() then return new; end if;
  if new.perguntas_liberadas and (tg_op = 'INSERT' or not coalesce(old.perguntas_liberadas, false)) then
    raise exception 'Só a Camilla escolhe o gargalo e libera as perguntas.';
  end if;
  return new;
end $$;
drop trigger if exists perguntas_so_quem_aprova on public.diagnostico_preparo;
create trigger perguntas_so_quem_aprova before insert or update on public.diagnostico_preparo for each row execute function public.perguntas_so_quem_aprova();
