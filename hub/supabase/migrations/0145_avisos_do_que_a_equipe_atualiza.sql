-- Quando a equipe (Camilla) atualiza algo para a loja, a loja recebe aviso no celular (se ligou os avisos)
-- e o atalho do Início fica laranja ("tem novidade"). O mesmo aviso não se repete em menos de 6 horas.

create table if not exists public.avisos_lojas_log (
  portal_id uuid not null, chave text not null, em timestamptz not null default now(),
  primary key (portal_id, chave)
);
alter table public.avisos_lojas_log enable row level security; -- sem política: só as funções do banco mexem

-- Avisa as pessoas do portal. p_loja: se vier, quem tem acesso travado em outra loja não recebe.
create or replace function public.avisar_portal(p_portal uuid, p_chave text, p_texto text, p_link text, p_loja text default null) returns void
language plpgsql security definer set search_path = public as $$
declare pessoas uuid[]; ult timestamptz;
begin
  select em into ult from avisos_lojas_log where portal_id = p_portal and chave = p_chave;
  if ult is not null and ult > now() - interval '6 hours' then return; end if;
  insert into avisos_lojas_log (portal_id, chave, em) values (p_portal, p_chave, now())
    on conflict (portal_id, chave) do update set em = now();
  select array_agg(f.id) into pessoas from perfis f
   where f.portal_id = p_portal and f.papel <> 'equipe'
     and (p_loja is null or f.loja_acesso is null or f.loja_acesso = p_loja);
  perform avisar_lojas(p_texto, p_link, pessoas);
end $$;
revoke all on function public.avisar_portal(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.trg_aviso_reuniao() returns trigger
language plpgsql security definer set search_path = public as $$
declare loja text := nullif(new.dados->>'loja', '');
begin
  if not public.is_equipe() then return new; end if; -- só quando foi a equipe que mexeu
  if new.tipo = 'feedback_time' then
    perform avisar_portal(new.portal_id, 'feedback_time:' || coalesce(loja, ''), 'Tem um feedback do time novo' || coalesce(' da ' || loja, '') || ' para você ler.', '/consultoria/reunioes', loja);
  elsif new.tipo = 'analise_semana' then
    perform avisar_portal(new.portal_id, 'analise_semana:' || coalesce(loja, ''), 'A análise da semana' || coalesce(' da ' || loja, '') || ' está pronta no portal.', '/consultoria/reunioes', loja);
  elsif new.tipo in ('analise', 'planejamento') then
    perform avisar_portal(new.portal_id, new.tipo, 'Tem uma reunião de gestão nova no portal para você ver.', '/consultoria/reunioes');
  end if;
  return new;
end $$;
drop trigger if exists aviso_reuniao on public.loja_reunioes;
create trigger aviso_reuniao after insert or update on public.loja_reunioes for each row execute function public.trg_aviso_reuniao();

create or replace function public.trg_aviso_leitura() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.publicada and (tg_op = 'INSERT' or not coalesce(old.publicada, false)) then
    perform avisar_portal(new.portal_id, 'leitura', 'A leitura da sua semana saiu. Abra o portal para ver.', '/leitura');
  end if;
  return new;
end $$;
drop trigger if exists aviso_leitura on public.loja_leituras;
create trigger aviso_leitura after insert or update on public.loja_leituras for each row execute function public.trg_aviso_leitura();

create or replace function public.trg_aviso_plano() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.retorno_em is not null and new.retorno_em is distinct from old.retorno_em then
    perform avisar_portal(new.portal_id, 'plano', 'A Camilla deixou o retorno do seu plano do mês. Abra o portal para ver.', '/planeje/mes');
  end if;
  return new;
end $$;
drop trigger if exists aviso_plano on public.loja_plano_mes;
create trigger aviso_plano after update on public.loja_plano_mes for each row execute function public.trg_aviso_plano();

create or replace function public.trg_aviso_resposta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'Respondida' and new.status is distinct from old.status then
    perform avisar_portal(new.portal_id, 'resposta', 'Sua pergunta foi respondida. Abra o portal para ver.', '/assistente');
  end if;
  return new;
end $$;
drop trigger if exists aviso_resposta on public.solicitacoes;
create trigger aviso_resposta after update on public.solicitacoes for each row execute function public.trg_aviso_resposta();
