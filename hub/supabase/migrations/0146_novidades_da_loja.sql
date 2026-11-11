-- A Camilla e a equipe recebem aviso (e a lista de Novidades) sempre que a loja alimenta o Hub:
-- caixa lançado, reunião de gestão salva e missão do dia cumprida. O mesmo texto não repete em 6 horas.

create or replace function public.novidade_unica(p_portal uuid, p_tipo text, p_texto text, p_link text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from novidades where portal_id = p_portal and tipo = p_tipo and texto = left(p_texto, 300) and created_at > now() - interval '6 hours') then return; end if;
  perform novidade(p_portal, p_tipo, p_texto, p_link);
exception when others then
  raise warning 'novidade_unica: %', sqlerrm; -- o aviso nunca impede a loja de salvar
end $$;

create or replace function public.nov_caixa() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_equipe() then return new; end if;
  perform novidade_unica(new.portal_id, 'caixa', '💰 ' || coalesce(nullif(new.loja, ''), nome_da_loja(new.portal_id)) || ' lançou o caixa de ' || to_char(new.dia, 'DD/MM'), '/gestao/caixa?portal=' || new.portal_id);
  return new;
end $$;
drop trigger if exists nov_caixa on public.loja_caixa;
create trigger nov_caixa after insert or update on public.loja_caixa for each row execute function public.nov_caixa();

create or replace function public.nov_reuniao() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_equipe() then return new; end if;
  perform novidade_unica(new.portal_id, 'reuniao', '📝 ' || nome_da_loja(new.portal_id) || ' salvou ' || case new.tipo when 'feedback_time' then 'um feedback do time' when 'analise_semana' then 'a análise da semana' else 'uma reunião de gestão' end, '/consultoria/reunioes?portal=' || new.portal_id);
  return new;
end $$;
drop trigger if exists nov_reuniao on public.loja_reunioes;
create trigger nov_reuniao after insert or update on public.loja_reunioes for each row execute function public.nov_reuniao();

create or replace function public.nov_missao() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.feito and not coalesce(old.feito, false) and not public.is_equipe() then
    perform novidade_unica(new.portal_id, 'missao', '🎯 ' || coalesce((select split_part(nome, ' ', 1) from loja_equipe where id = new.pessoa_id), 'Alguém') || ' (' || nome_da_loja(new.portal_id) || ') cumpriu a missão do dia', '/equipe/portal?portal=' || new.portal_id);
  end if;
  return new;
end $$;
drop trigger if exists nov_missao on public.loja_missao_dia;
create trigger nov_missao after update on public.loja_missao_dia for each row execute function public.nov_missao();
