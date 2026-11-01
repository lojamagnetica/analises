-- Início do plano de ação de 90 dias de cada loja. O Mês 1, 2 e 3 do plano mostram as datas a partir daqui.
-- Vazio = usa o início da loja. Dia 1 = meses do calendário (ex.: 01/11 a 30/11); outro dia = blocos de 30 dias.
alter table public.portais add column if not exists plano_inicio date;
