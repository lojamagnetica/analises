-- Análise da semana: roda no DOMINGO às 6h (Recife), só para as lojas que mandaram tudo da semana que fechou
-- (caixa de segunda a sábado e o estoque atualizado; quem não lança caixa no Hub, os números da semana).
-- Cada loja é uma chamada separada (antes era uma só e o servidor cortava depois de ~7 lojas).
-- Quem ficou faltando recebe no celular o que faltou; a Camilla recebe o resumo nas Conversas.
set lock_timeout = '8s';

create or replace function public.leitura_semana_domingo(dry boolean default false) returns jsonb
language plpgsql security definer set search_path = public, net, vault, storage as $$
declare
  hoje date := (now() at time zone 'America/Recife')::date;
  seg date := hoje - ((extract(isodow from hoje)::int) - 1) - case when extract(isodow from hoje) = 7 then 0 else 7 end;
  r record; falta text[]; dias int; chave text; pessoas uuid[]; prontas text[] := '{}'; faltando text[] := '{}'; msg text; camilla uuid[];
begin
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'aviso_chave';
  for r in select p.id, p.loja, ('gestao' = any (coalesce(p.menu_oculto, '{}'))) sem_gestao from portais p
            where p.ativo and p.tipo <> 'Curso'
              and (exists (select 1 from perfis f where f.portal_id = p.id and f.papel <> 'equipe')
                   or exists (select 1 from loja_caixa k where k.portal_id = p.id and k.dia >= hoje - 21)) loop
    falta := '{}';
    if r.sem_gestao then
      if not exists (select 1 from loja_numeros_semana n where n.portal_id = r.id and n.semana = seg) then
        falta := falta || 'os números da semana'::text;
      end if;
    else
      select count(*) into dias from generate_series(seg, seg + 5, interval '1 day') d
       where not exists (select 1 from loja_caixa c where c.portal_id = r.id and c.dia = d::date);
      if dias = 1 then falta := falta || 'o caixa de 1 dia'::text;
      elsif dias > 1 then falta := falta || ('o caixa de ' || dias || ' dias'); end if;
      if not exists (select 1 from storage.objects o where o.bucket_id = 'relatorios' and split_part(o.name, '/', 1) = r.id::text
                      and split_part(o.name, '/', 2) = 'gestao' and split_part(o.name, '/', 4) = seg::text
                      and split_part(o.name, '/', 5) like 'estoque_linha\_\_%') then
        falta := falta || 'o estoque atualizado'::text;
      end if;
    end if;

    if coalesce(array_length(falta, 1), 0) = 0 then
      prontas := prontas || r.loja;
      if not dry and chave is not null then
        perform net.http_post(
          url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/leitura-rascunho',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', chave),
          body := jsonb_build_object('portal_id', r.id), timeout_milliseconds := 120000);
      end if;
    else
      msg := case when array_length(falta, 1) = 1 then falta[1]
                  else array_to_string(falta[1:array_length(falta, 1) - 1], ', ') || ' e ' || falta[array_length(falta, 1)] end;
      faltando := faltando || (r.loja || ': falta ' || msg);
      select array_agg(distinct f.id) into pessoas from perfis f
       where f.portal_id = r.id and f.papel <> 'equipe' and exists (select 1 from push_assinaturas a where a.user_id = f.id);
      if not dry and pessoas is not null then
        perform avisar_lojas('A análise da sua semana não foi montada porque faltou ' || msg
          || '. Mande até sábado para receber a próxima na segunda. Precisa de ajuda? Fale com a Claudia.', '/envios', pessoas);
      end if;
    end if;
  end loop;

  if not dry then
    select array_agg(id) into camilla from perfis where papel = 'equipe' and aprova;
    insert into equipe_conversas (portal_id, tipo, texto, autor, autor_nome, para)
    select null, 'Pedido',
      '📊 Análise da semana de ' || to_char(seg, 'DD/MM') || ' a ' || to_char(seg + 5, 'DD/MM') || E'\n\n'
      || 'Montadas pelo agente (' || coalesce(array_length(prontas, 1), 0) || '), para você revisar e publicar até segunda: '
      || coalesce(array_to_string(prontas, ', '), 'nenhuma') || E'\n\n'
      || 'Sem análise por falta de dados (' || coalesce(array_length(faltando, 1), 0) || '; a loja já foi avisada do que faltou):' || E'\n• '
      || coalesce(array_to_string(faltando, E'\n• '), 'nenhuma'),
      null, 'Assistente Magnética', c from unnest(camilla) c;
    perform avisar_equipe(camilla, 'Análise da semana: ' || coalesce(array_length(prontas, 1), 0) || ' lojas prontas para revisar e '
      || coalesce(array_length(faltando, 1), 0) || ' sem dados. Detalhes nas Conversas.', '/equipe/conversas');
  end if;
  return jsonb_build_object('semana', seg, 'prontas', prontas, 'faltando', faltando);
end;
$$;
revoke all on function public.leitura_semana_domingo(boolean) from public, anon, authenticated;

-- Domingo às 6h de Recife (9h UTC). Substitui o agendamento de segunda.
select cron.schedule('leitura-rascunhos', '0 9 * * 0', 'select public.leitura_semana_domingo()');
