-- Agente do Diagnóstico: o banco confere sozinho, a cada 2 minutos, os lotes entregues ao Claude e guarda a resposta
-- quando terminam (antes só a tela aberta conferia). Usa as chaves internas "diagnostico" e "anon" (só no banco).
set lock_timeout = '8s';

create or replace function public.diagnostico_conferir() returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select portal_id from diagnostico_preparo where agente->>'estado' = 'trabalhando' and agente->>'lote' is not null loop
    perform net.http_post(
      url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/diagnostico-agente',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select valor from chaves_internas where nome = 'anon'),
        'x-hub-interno', (select valor from chaves_internas where nome = 'diagnostico')),
      body := jsonb_build_object('portal_id', r.portal_id, 'conferir', true),
      timeout_milliseconds := 30000);
  end loop;
end $$;
revoke execute on function public.diagnostico_conferir() from public, anon, authenticated;

select cron.schedule('diagnostico-conferir', '*/2 * * * *', 'select public.diagnostico_conferir()');
