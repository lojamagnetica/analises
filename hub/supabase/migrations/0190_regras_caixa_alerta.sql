-- Quando a loja confirma as Regras do caixa: a Camilla recebe o aviso e o agente confere os dias do mês com as regras
-- (relê os arquivos e compara com o Hub, sem mudar número) e monta de novo a análise da semana.
set lock_timeout = '8s';
create or replace function public.regras_caixa_confirmadas() returns trigger
language plpgsql security definer set search_path = public, net, vault as $$
declare chave text; camilla uuid[]; nome text;
begin
  if new.confirmado_em is null or new.confirmado_em is not distinct from (case when tg_op = 'UPDATE' then old.confirmado_em end) then return new; end if;
  select loja into nome from portais where id = new.portal_id;
  select array_agg(id) into camilla from perfis where papel = 'equipe' and aprova;
  perform avisar_equipe(camilla, nome || ' confirmou as Regras do caixa. Estou conferindo os dias com as regras; o resultado chega nas Conversas.', '/equipe/conversas');
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'aviso_chave';
  if chave is not null then
    perform net.http_post(
      url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/caixa-arquivos',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', chave),
      body := jsonb_build_object('conferir', true, 'portal_id', new.portal_id,
                                 'desde', to_char(date_trunc('month', (now() at time zone 'America/Recife')), 'YYYY-MM-DD')),
      timeout_milliseconds := 60000);
  end if;
  return new;
end $$;
drop trigger if exists regras_caixa_confirmadas on public.loja_regras_caixa;
create trigger regras_caixa_confirmadas after insert or update on public.loja_regras_caixa
  for each row execute function public.regras_caixa_confirmadas();
