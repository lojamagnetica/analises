-- Confirmação das reuniões com mentoradas: 2 horas antes de cada reunião, a Assistente Magnética pergunta à Camilla
-- no Conversas se pode confirmar o horário ou se ela vai precisar de uns minutos. Só depois da resposta a cliente
-- recebe a confirmação no Fale com a Camilla (com aviso no celular) e o Conversas deixa o WhatsApp pronto.
set lock_timeout = '8s';

alter table public.equipe_conversas add column if not exists acao jsonb;
alter table public.reunioes add column if not exists confirmacao_perguntada_em timestamptz;
alter table public.reunioes add column if not exists confirmacao jsonb;

-- Reunião que mudou de horário volta a ser perguntada.
create or replace function public.reuniao_nova_confirmacao() returns trigger
language plpgsql as $$
begin
  if new.data is distinct from old.data then new.confirmacao_perguntada_em := null; new.confirmacao := null; end if;
  return new;
end $$;
drop trigger if exists reuniao_nova_confirmacao on public.reunioes;
create trigger reuniao_nova_confirmacao before update on public.reunioes for each row execute function public.reuniao_nova_confirmacao();

-- A conversa que a equipe abre para a loja nasce sem texto da loja: não é pedido novo.
create or replace function public.nov_pedido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.autor is null and coalesce(new.texto, '') = '' then return new; end if;
  perform novidade(new.portal_id, 'pedido', '📨 ' || nome_da_loja(new.portal_id) || ': ' || coalesce(nullif(left(new.texto, 80), ''), 'novo pedido'), '/equipe/pendencias');
  return new;
end $$;

create or replace function public.reunioes_perguntar_confirmacao() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; feitos int := 0; para uuid;
begin
  -- A pergunta vai para a Camilla (quem libera no Hub); o aviso no celular sai pelo gatilho do Conversas.
  select id into para from perfis where aprova and conversas_equipe order by nome limit 1;
  for r in
    select x.id, x.titulo, x.data, p.loja, coalesce(nullif(trim(p.responsavel), ''), p.loja) as quem
      from reunioes x join portais p on p.id = x.portal_id
     where x.selecionar = 'Pendente' and x.confirmacao_perguntada_em is null
       and x.data > now() and x.data <= now() + interval '2 hours'
       and p.ativo and p.tipo ilike 'Mentoria%'
     order by x.data
  loop
    insert into equipe_conversas (portal_id, tipo, texto, autor, autor_nome, para, acao)
    values (null, 'Pedido',
      format('📅 Reunião com %s (%s) hoje às %s%s. Posso confirmar o horário com ela ou você vai precisar de uns minutos?',
        r.quem, r.loja, to_char(r.data at time zone 'America/Recife', 'HH24:MI'), coalesce(' · ' || nullif(trim(r.titulo), ''), '')),
      null, 'Assistente Magnética', para,
      jsonb_build_object('tipo', 'confirmar_reuniao', 'reuniao_id', r.id, 'estado', 'pendente'));
    update reunioes set confirmacao_perguntada_em = now() where id = r.id;
    feitos := feitos + 1;
  end loop;
  return feitos;
end $$;
revoke execute on function public.reunioes_perguntar_confirmacao() from public, anon, authenticated;

-- A resposta da Camilla: p_minutos 0 = no horário, > 0 = começa uns minutos depois, null = não mandar nada.
create or replace function public.reuniao_confirmar(p_conversa uuid, p_minutos integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c equipe_conversas; r reunioes; p portais; inicio timestamptz; nome text; msg text; meet text; sol uuid; nova jsonb;
begin
  if not public.pode_conversas() then raise exception 'Só a equipe responde.'; end if;
  select * into c from equipe_conversas where id = p_conversa for update;
  if c.id is null or c.acao->>'tipo' is distinct from 'confirmar_reuniao' then raise exception 'Mensagem sem reunião para confirmar.'; end if;
  if c.acao->>'estado' is distinct from 'pendente' then return c.acao; end if;
  select * into r from reunioes where id = (c.acao->>'reuniao_id')::uuid;
  if r.id is null then raise exception 'A reunião não está mais na agenda.'; end if;
  select * into p from portais where id = r.portal_id;

  if p_minutos is null then
    nova := c.acao || jsonb_build_object('estado', 'nao', 'em', now(), 'por', auth.uid());
  else
    p_minutos := greatest(0, least(p_minutos, 60));
    inicio := r.data + make_interval(mins => p_minutos);
    nome := split_part(trim(coalesce(p.responsavel, '')), ' ', 1);
    select a.meet_url into meet from agenda_eventos a where a.gcal_id = r.gcal_event_id and a.meet_url is not null limit 1;
    msg := case when nome <> '' then format('Oi, %s! ', nome) else 'Oi! ' end || 'Aqui é a Camilla, da Loja Magnética. '
      || case when p_minutos = 0
           then format('Passando para confirmar a nossa reunião de hoje, às %s. Te espero lá!', to_char(r.data at time zone 'America/Recife', 'HH24:MI'))
           else format('Passando para confirmar a nossa reunião de hoje. Vou precisar de uns minutinhos: começamos às %s. Te espero lá!', to_char(inicio at time zone 'America/Recife', 'HH24:MI'))
         end
      || coalesce(E'\n' || 'Link da reunião: ' || meet, '');
    -- Entra no Fale com a Camilla da loja como resposta da Camilla (conversa nova, já respondida: não abre pendência).
    insert into solicitacoes (portal_id, autor, autor_nome, tipo, texto, status)
    values (p.id, null, 'Camilla', 'Aviso', '', 'Respondida') returning id into sol;
    insert into solicitacao_respostas (solicitacao_id, portal_id, autor, autor_nome, equipe, texto)
    values (sol, p.id, auth.uid(), 'Camilla', true, msg);
    perform avisar_portal(p.id, 'confirmar_reuniao:' || r.id, left(msg, 160), '/assistente');
    nova := c.acao || jsonb_build_object('estado', 'confirmada', 'minutos', p_minutos, 'texto', msg,
      'whatsapp', nullif(regexp_replace(coalesce(p.whatsapp, ''), '\D', '', 'g'), ''), 'em', now(), 'por', auth.uid());
  end if;

  update equipe_conversas set acao = nova, status = 'concluida' where id = c.id;
  update reunioes set confirmacao = nova where id = r.id;
  return nova;
end $$;
revoke execute on function public.reuniao_confirmar(uuid, integer) from public, anon;
grant execute on function public.reuniao_confirmar(uuid, integer) to authenticated;

-- De 10 em 10 minutos: pergunta as reuniões que começam nas próximas 2 horas.
select cron.unschedule('reunioes-confirmar') where exists (select 1 from cron.job where jobname = 'reunioes-confirmar');
select cron.schedule('reunioes-confirmar', '*/10 * * * *', $$select public.reunioes_perguntar_confirmacao()$$);
