-- Leitura automática da Agenda: a cada 10 minutos o banco chama a função agenda-sincronizar,
-- mas só depois que a chave do Google foi guardada (chaves_internas, nome google_agenda).
-- A função se protege sozinha: só aceita a chamada com a senha interna "agenda", lida da tabela na hora
-- de chamar (não fica neste arquivo), ou de uma pessoa da equipe logada.
set lock_timeout = '8s';

select cron.schedule(
  'agenda-sincronizar',
  '*/10 * * * *',
  $cron$
  select net.http_post(
    url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/agenda-sincronizar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-hub-interno', (select valor from public.chaves_internas where nome = 'agenda')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  )
  where exists (select 1 from public.chaves_internas where nome = 'google_agenda')
    and exists (select 1 from public.chaves_internas where nome = 'agenda');
  $cron$
);
