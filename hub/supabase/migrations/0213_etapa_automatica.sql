-- A etapa da jornada (e o passo que a loja vê) avança sozinha conforme as entregas: nunca volta.
-- 2 Diagnóstico: a loja mandou os dados · 3 Plano de Ação: diagnóstico liberado · 4 Implementação: plano entregue
-- 5 Revisão: 90 dias do plano · 6 Novo ciclo: revisão entregue (ou 105 dias) · 7 Encerramento: plano já entregue e contrato vence em até 30 dias.
-- Só mentoria (consultoria tem caminho próprio). Roda quando entra uma entrega, quando a loja manda os dados e todo dia.
create or replace function etapa_sugerida(p_portal uuid) returns int language plpgsql stable security definer set search_path = public as $$
declare e int := 1; ini date; p record;
begin
  select id, tipo, plano_inicio, plano_titulos into p from portais where id = p_portal;
  if p.tipo is distinct from 'Mentoria' then return null; end if;
  if exists (select 1 from portal_entrada where portal_id = p_portal and dados_enviados_em is not null) then e := 2; end if;
  if exists (select 1 from loja_diagnostico where portal_id = p_portal and status = 'liberada') then e := 3; end if;
  if p.plano_inicio is not null or coalesce(p.plano_titulos::text, '{}') not in ('{}', 'null')
     or exists (select 1 from loja_entregas where portal_id = p_portal and (titulo ilike '%plano de a%' or titulo ilike '%rota%')) then e := 4; end if;
  if e >= 4 then
    ini := coalesce(p.plano_inicio, (select min(liberada_em)::date + 7 from loja_diagnostico where portal_id = p_portal and status = 'liberada'));
    if ini is not null and current_date >= ini + 90 then e := 5; end if;
    if exists (select 1 from loja_entregas where portal_id = p_portal and titulo ilike '%revis%') or (ini is not null and current_date >= ini + 105) then e := greatest(e, 6); end if;
  end if;
  if e >= 4 and exists (select 1 from contratos where portal_id = p_portal and status = 'Ativo' and fim is not null and fim <= current_date + 30) then e := 7; end if;
  return e;
end $$;

create or replace function etapa_avancar(p_portal uuid) returns void language plpgsql security definer set search_path = public as $$
declare s int := etapa_sugerida(p_portal);
begin
  if s is null then return; end if;
  update fichas set etapa = s where portal_id = p_portal and coalesce(etapa, 0) < s;
end $$;

create or replace function etapa_gatilho() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform etapa_avancar(new.portal_id);
  return new;
exception when others then return new;
end $$;

drop trigger if exists trg_etapa_entrega on loja_entregas;
create trigger trg_etapa_entrega after insert or update on loja_entregas for each row execute function etapa_gatilho();
drop trigger if exists trg_etapa_entrada on portal_entrada;
create trigger trg_etapa_entrada after insert or update of dados_enviados_em on portal_entrada for each row execute function etapa_gatilho();

create or replace function etapas_do_dia() returns void language sql security definer set search_path = public as $$
  select etapa_avancar(id) from portais where ativo and tipo = 'Mentoria';
$$;
select cron.unschedule('etapas-do-dia') where exists (select 1 from cron.job where jobname = 'etapas-do-dia');
select cron.schedule('etapas-do-dia', '17 9 * * *', 'select public.etapas_do_dia()');
