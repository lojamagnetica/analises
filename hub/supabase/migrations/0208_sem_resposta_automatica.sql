-- Fale com a Camilla: desliga a resposta automática da Assistente Magnética para quem espera mais de 24h (pedido da Camilla, 19/11).
-- A função avisar_espera() continua no banco, mas não roda mais.
select cron.unschedule('avisar-espera') where exists (select 1 from cron.job where jobname = 'avisar-espera');

-- Limpeza (19/11): a Camilla zerou as mensagens em aberto do Fale com a Camilla e das Conversas da equipe.
update solicitacoes set status = 'Concluída' where status in ('Recebida', 'Em andamento');
update equipe_conversas set status = 'concluida' where status = 'aberta';
