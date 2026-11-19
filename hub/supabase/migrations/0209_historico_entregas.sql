-- Histórico de entregas: tudo o que a equipe entrega para a loja vira registro automático.
-- A loja vê em "O que você recebeu"; a Camilla e a Claudia veem no histórico da ficha da loja.
-- Cada entrega nasce quando o item é liberado/publicado e some se voltar para rascunho.
create table if not exists loja_entregas (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references portais(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  link text,
  entregue_em timestamptz not null default now(),
  origem text not null,
  origem_id text not null,
  unique (origem, origem_id)
);
create index if not exists loja_entregas_portal on loja_entregas (portal_id, entregue_em desc);
alter table loja_entregas enable row level security;
drop policy if exists entregas_equipe on loja_entregas;
create policy entregas_equipe on loja_entregas for all using (is_equipe()) with check (is_equipe());
drop policy if exists entregas_ler on loja_entregas;
create policy entregas_ler on loja_entregas for select using (pode_ver(portal_id));

create or replace function entrega_registrar(p_portal uuid, p_tipo text, p_titulo text, p_link text, p_quando timestamptz, p_origem text, p_origem_id text, p_entregue boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_portal is null then return; end if;
  if p_entregue then
    insert into loja_entregas (portal_id, tipo, titulo, link, entregue_em, origem, origem_id)
    values (p_portal, p_tipo, p_titulo, p_link, coalesce(p_quando, now()), p_origem, p_origem_id)
    on conflict (origem, origem_id) do update set titulo = excluded.titulo, link = excluded.link, tipo = excluded.tipo;
  else
    delete from loja_entregas where origem = p_origem and origem_id = p_origem_id;
  end if;
end $$;

create or replace function entrega_gatilho() returns trigger language plpgsql security definer set search_path = public as $$
begin
  case tg_table_name
    when 'consultoria_materiais' then
      perform entrega_registrar(new.portal_id, 'Material', new.titulo, '/consultoria/materiais/ver?id=' || new.id, coalesce(new.liberado_em::timestamptz, now()), 'material', new.id::text, coalesce(new.liberado, false));
    when 'consultoria_entregas' then
      perform entrega_registrar(new.portal_id, 'Entrega da consultoria', new.entrega, new.material_url, now(), 'consultoria', new.id::text, new.status = 'Entregue');
    when 'loja_diagnostico' then
      perform entrega_registrar(new.portal_id, 'Diagnóstico', 'Diagnóstico' || case when coalesce(new.loja, '') <> '' then ' · ' || new.loja else '' end, '/painel', coalesce(new.liberada_em::timestamptz, now()), 'diagnostico', new.portal_id || '|' || coalesce(new.loja, ''), new.status = 'liberada');
    when 'loja_gestao' then
      perform entrega_registrar(new.portal_id, 'Gestão estratégica',
        (case new.area when 'estoque' then 'Estoque' when 'compras' then 'Compras' when 'linhas' then 'Linhas' when 'fornecedores' then 'Fornecedores' else initcap(new.area) end)
        || case when coalesce(new.loja, '') <> '' then ' · ' || new.loja else '' end,
        '/estoque', coalesce(new.liberada_em::timestamptz, now()), 'gestao', new.portal_id || '|' || new.area || '|' || coalesce(new.loja, ''), new.status = 'liberada');
    when 'loja_analise_perfil' then
      perform entrega_registrar(new.portal_id, 'Análise do Instagram', 'Análise do perfil do Instagram', '/conteudo', coalesce(new.liberada_em::timestamptz, now()), 'perfil', new.portal_id::text, new.status = 'liberada');
    when 'loja_analise_extra' then
      perform entrega_registrar(new.portal_id, 'Análise do Instagram', 'Análise do Instagram · ' || coalesce(new.instagram, ''), '/conteudo', coalesce(new.liberada_em::timestamptz, now()), 'perfil_extra', new.id::text, new.status = 'liberada');
    when 'loja_leituras' then
      perform entrega_registrar(new.portal_id, 'Leitura da semana', 'Leitura da semana de ' || to_char(new.semana, 'DD/MM'), '/leitura', coalesce(new.publicada_em::timestamptz, now()), 'leitura', new.id::text, coalesce(new.publicada, false));
    when 'loja_historia' then
      perform entrega_registrar(new.portal_id, 'Nossa história', 'Nossa história (storytelling da loja)', '/nossa-historia', now(), 'historia', new.id::text, coalesce(new.narrativa_aprovada, false));
    when 'loja_planner' then
      perform entrega_registrar(new.portal_id, 'Planner de gestão', 'Planner de gestão' || case when coalesce(new.loja, '') <> '' then ' · ' || new.loja else '' end, '/consultoria/planner', now(), 'planner', new.portal_id || '|' || coalesce(new.loja, ''), coalesce(new.liberado, false));
    when 'loja_plano_mes' then
      perform entrega_registrar(new.portal_id, 'Plano do mês', 'Retorno da Camilla no plano de ' || to_char(to_date(new.mes, 'YYYY-MM'), 'MM/YYYY'), '/planeje', coalesce(new.retorno_em::timestamptz, now()), 'plano', new.portal_id || '|' || new.mes, new.status = 'ok');
    when 'reunioes' then
      perform entrega_registrar(new.portal_id, 'Resumo da reunião', coalesce(nullif(new.titulo, ''), 'Reunião') || ' · ' || to_char(new.data at time zone 'America/Recife', 'DD/MM'), '/reunioes', new.data, 'reuniao', new.id::text, coalesce(new.ata, '') <> '');
    else null;
  end case;
  return new;
-- O registro nunca pode travar a liberação: se der erro aqui, a entrega segue e o histórico fica sem a linha.
exception when others then
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['consultoria_materiais','consultoria_entregas','loja_diagnostico','loja_gestao','loja_analise_perfil','loja_analise_extra','loja_leituras','loja_historia','loja_planner','loja_plano_mes','reunioes'] loop
    execute format('drop trigger if exists trg_entrega on %I', t);
    execute format('create trigger trg_entrega after insert or update on %I for each row execute function entrega_gatilho()', t);
  end loop;
end $$;

-- Histórico do que já foi entregue até hoje.
select entrega_registrar(portal_id, 'Material', titulo, '/consultoria/materiais/ver?id=' || id, coalesce(liberado_em::timestamptz, created_at), 'material', id::text, true) from consultoria_materiais where liberado;
select entrega_registrar(portal_id, 'Entrega da consultoria', entrega, material_url, now(), 'consultoria', id::text, true) from consultoria_entregas where status = 'Entregue';
select entrega_registrar(portal_id, 'Diagnóstico', 'Diagnóstico' || case when coalesce(loja, '') <> '' then ' · ' || loja else '' end, '/painel', coalesce(liberada_em, updated_at), 'diagnostico', portal_id || '|' || coalesce(loja, ''), true) from loja_diagnostico where status = 'liberada';
select entrega_registrar(portal_id, 'Gestão estratégica', (case area when 'estoque' then 'Estoque' when 'compras' then 'Compras' when 'linhas' then 'Linhas' when 'fornecedores' then 'Fornecedores' else initcap(area) end) || case when coalesce(loja, '') <> '' then ' · ' || loja else '' end, '/estoque', coalesce(liberada_em, updated_at), 'gestao', portal_id || '|' || area || '|' || coalesce(loja, ''), true) from loja_gestao where status = 'liberada';
select entrega_registrar(portal_id, 'Análise do Instagram', 'Análise do perfil do Instagram', '/conteudo', coalesce(liberada_em, updated_at), 'perfil', portal_id::text, true) from loja_analise_perfil where status = 'liberada';
select entrega_registrar(portal_id, 'Análise do Instagram', 'Análise do Instagram · ' || coalesce(instagram, ''), '/conteudo', coalesce(liberada_em, updated_at), 'perfil_extra', id::text, true) from loja_analise_extra where status = 'liberada';
select entrega_registrar(portal_id, 'Leitura da semana', 'Leitura da semana de ' || to_char(semana, 'DD/MM'), '/leitura', coalesce(publicada_em, updated_at), 'leitura', id::text, true) from loja_leituras where publicada;
select entrega_registrar(portal_id, 'Nossa história', 'Nossa história (storytelling da loja)', '/nossa-historia', updated_at, 'historia', id::text, true) from loja_historia where narrativa_aprovada;
select entrega_registrar(portal_id, 'Planner de gestão', 'Planner de gestão' || case when coalesce(loja, '') <> '' then ' · ' || loja else '' end, '/consultoria/planner', updated_at, 'planner', portal_id || '|' || coalesce(loja, ''), true) from loja_planner where liberado;
select entrega_registrar(portal_id, 'Plano do mês', 'Retorno da Camilla no plano de ' || to_char(to_date(mes, 'YYYY-MM'), 'MM/YYYY'), '/planeje', coalesce(retorno_em, updated_at), 'plano', portal_id || '|' || mes, true) from loja_plano_mes where status = 'ok';
select entrega_registrar(portal_id, 'Resumo da reunião', coalesce(nullif(titulo, ''), 'Reunião') || ' · ' || to_char(data at time zone 'America/Recife', 'DD/MM'), '/reunioes', data, 'reuniao', id::text, true) from reunioes where coalesce(ata, '') <> '' and portal_id is not null;
