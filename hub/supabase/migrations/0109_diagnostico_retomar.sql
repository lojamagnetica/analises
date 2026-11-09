-- Agente do Diagnóstico: o Supabase derruba a função quando ela passa do tempo de processamento ("CPU Time exceeded").
-- A leitura dos PDFs vai em partes e a função se chama de novo; se uma chamada cair no meio, este despertador
-- (a cada minuto) retoma a loja que ficou parada em "trabalhando" sem lote. Depois de 20 tentativas sem avanço, desiste
-- e mostra o erro. Usa as chaves internas "diagnostico" (a da função) e "anon" (a chave pública do projeto), que ficam
-- só no banco, em chaves_internas.
set lock_timeout = '8s';

create or replace function public.diagnostico_retomar() returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
  tent int;
begin
  for r in
    select portal_id, agente from diagnostico_preparo
    where agente->>'estado' = 'trabalhando' and agente->>'lote' is null and updated_at < now() - interval '90 seconds'
  loop
    tent := coalesce((r.agente->>'tentativas')::int, 0);
    if tent >= 20 then
      update diagnostico_preparo set updated_at = now(), agente = agente || jsonb_build_object('estado', 'erro', 'fim', now(),
        'msg', 'O servidor não conseguiu ler os arquivos desta loja. Tire arquivos repetidos ou muito grandes da pasta e tente de novo.')
      where portal_id = r.portal_id;
      continue;
    end if;
    update diagnostico_preparo set updated_at = now(), agente = agente || jsonb_build_object('tentativas', tent + 1)
    where portal_id = r.portal_id;
    perform net.http_post(
      url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/diagnostico-agente',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select valor from chaves_internas where nome = 'anon'),
        'x-hub-interno', (select valor from chaves_internas where nome = 'diagnostico')),
      body := jsonb_build_object('portal_id', r.portal_id, 'parada', r.agente->>'parada', 'continuar', true),
      timeout_milliseconds := 10000);
  end loop;
end $$;
revoke execute on function public.diagnostico_retomar() from public, anon, authenticated;

select cron.schedule('diagnostico-retomar', '* * * * *', 'select public.diagnostico_retomar()');
