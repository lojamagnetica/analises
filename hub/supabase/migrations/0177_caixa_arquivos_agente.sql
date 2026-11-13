-- O agente dos arquivos do caixa (função caixa-arquivos): antes de o dia ficar com "falta" ou "não bate",
-- ele lê os arquivos que a loja anexou e completa o que falta. Roda todo dia às 23h (Recife) nos últimos 7 dias.
set lock_timeout = '8s';

-- O dia de caixa tem algo faltando ou que não bate? (para o agente, pelo id)
create or replace function public.caixa_id_com_problema(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.caixa_com_problema(k, exists (select 1 from loja_equipe e where e.portal_id = k.portal_id and e.ativo))
  from loja_caixa k where k.id = p_id;
$$;
revoke all on function public.caixa_id_com_problema(uuid) from public, anon, authenticated;
grant execute on function public.caixa_id_com_problema(uuid) to service_role;

select cron.schedule('caixa-arquivos', '0 2 * * *', $$
  select net.http_post(
    url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/caixa-arquivos',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', (select decrypted_secret from vault.decrypted_secrets where name = 'aviso_chave')),
    body := '{"rodada": true}'::jsonb
  );
$$);
