-- Quem aprova o que vai para a loja: só quem tem perfis.aprova (a Camilla). A equipe monta o storytelling
-- e encaminha pronto (narrativa_pronta); a Camilla aprova e libera.
alter table public.perfis add column if not exists aprova boolean not null default false;
update public.perfis set aprova = true where estudio and papel = 'equipe' and not aprova;

create or replace function public.pode_aprovar() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.aprova and p.papel = 'equipe' from perfis p where p.id = auth.uid()), false);
$$;

alter table public.loja_historia add column if not exists narrativa_pronta boolean not null default false;

-- O banco garante: sem poder de aprovar, não libera a história, não aprova o storytelling
-- e não mexe no texto já aprovado. Sem login (link da lojista, funções do servidor) segue como antes.
create or replace function public.historia_so_quem_aprova() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.pode_aprovar() then return new; end if;
  if new.liberado and not old.liberado then raise exception 'Só a Camilla libera a história para a loja.'; end if;
  if new.narrativa_aprovada and not old.narrativa_aprovada then raise exception 'Só a Camilla aprova o storytelling. Use "Encaminhar para a Camilla aprovar".'; end if;
  if old.narrativa_aprovada and new.narrativa_aprovada and new.narrativa is distinct from old.narrativa then
    raise exception 'O storytelling já está aprovado. Para mudar, peça à Camilla para voltar para rascunho.';
  end if;
  return new;
end $$;

drop trigger if exists historia_so_quem_aprova on public.loja_historia;
create trigger historia_so_quem_aprova before update on public.loja_historia
  for each row execute function public.historia_so_quem_aprova();

-- A equipe pode editar perfis, mas o poder de aprovar só quem já aprova dá ou tira.
create or replace function public.perfis_aprova_protegido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.aprova is distinct from old.aprova and auth.uid() is not null and not public.pode_aprovar() then
    raise exception 'Só a Camilla muda quem aprova.';
  end if;
  return new;
end $$;

drop trigger if exists perfis_aprova_protegido on public.perfis;
create trigger perfis_aprova_protegido before update on public.perfis
  for each row execute function public.perfis_aprova_protegido();
