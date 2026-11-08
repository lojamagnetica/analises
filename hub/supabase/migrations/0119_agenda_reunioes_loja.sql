-- Reunião marcada na agenda do Google aparece no portal da loja (Início › Próximo encontro e Reuniões).
-- O título do evento começa pelo nome da loja: "RIVA - Reunião", "LISI - Diagnóstico", "Mercadão - Pedro (...)".
-- A loja é achada pelo começo do nome (sem acento e sem diferença de maiúscula) ou por um apelido em portais.apelidos.
-- Só liga quando acha UMA loja. Evento apagado no Google: a reunião futura fica "Adiado" (some do Início).
set lock_timeout = '8s';

create or replace function public.sem_acento_mai(t text) returns text language sql immutable as $$
  select upper(translate(coalesce(t, ''), 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
$$;

create or replace function public.portal_do_evento(titulo text) returns uuid language sql stable security definer set search_path = public as $$
  with p as (select public.sem_acento_mai(trim(split_part(titulo, ' - ', 1))) as nome where position(' - ' in coalesce(titulo, '')) > 0),
  achados as (
    select distinct x.id from portais x, p
    where x.ativo and length(p.nome) >= 3 and (
      public.sem_acento_mai(x.loja) = p.nome
      or public.sem_acento_mai(x.loja) like p.nome || ' %'
      or exists (select 1 from unnest(coalesce(x.apelidos, '{}')) a where public.sem_acento_mai(a) = p.nome))
  )
  select case when (select count(*) from achados) = 1 then (select id from achados) end
$$;

create or replace function public.agenda_para_reuniao() returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid; resto text;
begin
  if tg_op = 'DELETE' then
    update reunioes set selecionar = 'Adiado' where gcal_event_id = old.gcal_id and data > now() and selecionar = 'Pendente';
    return old;
  end if;
  if new.dia_inteiro then return new; end if;
  pid := portal_do_evento(new.titulo);
  if pid is null then return new; end if;
  resto := trim(substr(new.titulo, position(' - ' in new.titulo) + 3));
  insert into reunioes (portal_id, titulo, data, gcal_event_id)
  values (pid, case when lower(resto) in ('reunião', 'reuniao', '') then 'Reunião individual' else resto end, new.inicio, new.gcal_id)
  on conflict (gcal_event_id) do update set data = excluded.data, titulo = case when reunioes.titulo is null or reunioes.titulo = '' then excluded.titulo else reunioes.titulo end, portal_id = excluded.portal_id,
    selecionar = case when reunioes.selecionar = 'Adiado' then 'Pendente' else reunioes.selecionar end;
  return new;
exception when others then
  raise warning 'agenda_para_reuniao: %', sqlerrm;  -- a agenda nunca pode falhar por causa disso
  return coalesce(new, old);
end $$;

drop trigger if exists agenda_para_reuniao on public.agenda_eventos;
create trigger agenda_para_reuniao after insert or update or delete on public.agenda_eventos
  for each row execute function public.agenda_para_reuniao();

-- Liga os eventos que já estão na agenda (de hoje em diante).
update public.agenda_eventos set titulo = titulo where inicio >= now();
