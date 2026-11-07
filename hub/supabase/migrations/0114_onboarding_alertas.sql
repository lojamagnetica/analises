-- Onboarding: cada etapa dos Dados da loja concluída (ou atualizada) e cada envio de arquivos da loja viram alerta
-- só para quem aprova e quem monta (Camilla e Claudia), na tela Novidades e no celular.
set lock_timeout = '8s';

-- Novidade só para Camilla e Claudia (e só quando quem fez é a loja).
create or replace function public.novidade_cs(p_portal uuid, p_tipo text, p_texto text, p_link text) returns void
language plpgsql security definer set search_path = public as $$
declare para uuid[];
begin
  if public.is_equipe() then return; end if;
  select array_agg(id) into para from perfis where papel = 'equipe' and (aprova or monta);
  insert into novidades (portal_id, tipo, texto, link, para) values (p_portal, p_tipo, left(p_texto, 300), p_link, para);
exception when others then
  -- O aviso nunca pode impedir a loja de salvar.
  raise warning 'novidade_cs: %', sqlerrm;
end $$;
revoke all on function public.novidade_cs(uuid, text, text, text) from public, anon, authenticated;

-- Nome e posição de cada etapa na trilha (a mesma ordem de ETAPAS em lib/conteudo.ts).
create or replace function public.etapa_da_trilha(n int) returns text language sql immutable as $$
  select case n when 1 then '1 de 8 · A loja hoje' when 9 then '2 de 8 · Gestão da loja' when 10 then '3 de 8 · Ações e resultados'
    when 5 then '4 de 8 · Time de vendas' when 3 then '5 de 8 · Cliente ideal' when 4 then '6 de 8 · Mix de produtos e preços'
    when 8 then '7 de 8 · Estoque e relatórios' when 7 then '8 de 8 · Canais e conteúdo' else 'etapa ' || n end
$$;

create or replace function public.nov_etapa() returns trigger language plpgsql security definer set search_path = public as $$
declare feitas int;
begin
  if new.concluida and (tg_op = 'INSERT' or not old.concluida) then
    perform novidade_cs(new.portal_id, 'etapa', '✅ ' || nome_da_loja(new.portal_id) || ' concluiu a etapa ' || etapa_da_trilha(new.etapa) || ' dos Dados da loja', '/personalizacao?portal=' || new.portal_id);
    select count(*) into feitas from personalizacao where portal_id = new.portal_id and concluida and etapa in (1, 9, 10, 5, 3, 4, 8, 7);
    if feitas = 8 then
      perform novidade_cs(new.portal_id, 'etapa', '🎉 ' || nome_da_loja(new.portal_id) || ' terminou todos os Dados da loja', '/personalizacao?portal=' || new.portal_id);
    end if;
  elsif tg_op = 'UPDATE' and old.concluida and new.respostas is distinct from old.respostas then
    perform novidade_cs(new.portal_id, 'etapa', '✏️ ' || nome_da_loja(new.portal_id) || ' atualizou a etapa ' || etapa_da_trilha(new.etapa) || ' dos Dados da loja', '/personalizacao?portal=' || new.portal_id);
  end if;
  return new;
end $$;

-- A loja subiu arquivos (Estoque e relatórios): um alerta por envio, com quantos e de quê.
create or replace function public.avisar_envio(p_qtd int, p_tipo text) returns void
language plpgsql security definer set search_path = public as $$
declare p uuid := public.meu_portal();
begin
  if p is null or public.is_equipe() then return; end if;
  perform novidade_cs(p, 'envio', '📎 ' || nome_da_loja(p) || ' enviou ' || p_qtd || case when p_qtd = 1 then ' arquivo' else ' arquivos' end || coalesce(' · ' || nullif(left(p_tipo, 60), ''), ''), '/personalizacao/etapa?n=8&portal=' || p);
end $$;
revoke all on function public.avisar_envio(int, text) from public, anon;
grant execute on function public.avisar_envio(int, text) to authenticated;
