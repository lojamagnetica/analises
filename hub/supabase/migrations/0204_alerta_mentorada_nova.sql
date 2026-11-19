-- Mentorada nova: quando o Comercial registra a passagem, a Camilla e a CS recebem o alerta.
-- Vai como mensagem "Urgente" nas Conversas da equipe (o push sai pelo gatilho conversa_avisar) e um lembrete do dia para a CS.
set lock_timeout='8s';
create or replace function public.passagem_avisar() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare v_loja text; v_resp text; v_plano text; cs uuid;
begin
  select loja, responsavel into v_loja, v_resp from portais where id = new.portal_id;
  select nome into v_plano from planos where id::text = new.plano_id::text;
  insert into equipe_conversas (portal_id, tipo, texto, autor, autor_nome)
  values (new.portal_id, 'Urgente',
    '🆕 Mentorada nova: ' || coalesce(v_loja, 'loja') || coalesce(' (' || v_resp || ')', '') ||
    coalesce(' · plano ' || v_plano, '') || coalesce(' · vendida por ' || new.vendido_por, '') || coalesce(' · registrada por ' || new.criado_por, '') ||
    E'.\nPróximo passo: receber a passagem do Comercial na Jornada das clientes e mandar as boas-vindas.',
    null, 'Assistente Magnética');
  for cs in select id from perfis where portal_id is null and monta and not aprova loop
    insert into equipe_lembretes (portal_id, texto, quando, responsavel, criado_por)
    values (new.portal_id, 'Mentorada nova: receber a passagem do Comercial e mandar as boas-vindas', (now() at time zone 'America/Recife')::date, cs, 'Assistente Magnética');
  end loop;
  return new;
exception when others then
  raise warning 'passagem_avisar: %', sqlerrm;
  return new;
end $$;
drop trigger if exists passagem_avisar on public.passagens;
create trigger passagem_avisar after insert on public.passagens for each row execute function public.passagem_avisar();
