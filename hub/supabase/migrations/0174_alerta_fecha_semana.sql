-- Sábado é o último dia para a loja mandar o caixa da semana e os 2 relatórios (estoque e crediário):
-- é com eles que o agente monta a análise da semana na segunda, a Camilla revisa e libera.
-- O aviso vai no celular só para a loja que ainda tem algo faltando, dizendo o que falta.
set lock_timeout = '8s';

create or replace function public.lembrete_fecha_semana(dry boolean default false) returns integer
language plpgsql security definer set search_path = public, storage as $$
declare
  hoje date := (now() at time zone 'America/Recife')::date;
  seg date := hoje - ((extract(isodow from hoje)::int) - 1);
  r record; pessoas uuid[]; enviados int := 0; dias int; falta text[]; msg text;
begin
  for r in select p.id, p.lojas from portais p
            where p.ativo and p.tipo <> 'Curso' and not (coalesce(p.menu_oculto, '{}') @> array['gestao']) loop
    falta := '{}';
    -- dias de loja (segunda até ontem) sem nenhum caixa lançado
    select count(*) into dias from generate_series(seg, hoje - 1, interval '1 day') d
     where not exists (select 1 from loja_caixa c where c.portal_id = r.id and c.dia = d::date);
    if dias = 1 then falta := falta || 'o caixa de 1 dia'::text;
    elsif dias > 1 then falta := falta || ('o caixa de ' || dias || ' dias'); end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'relatorios' and split_part(o.name, '/', 1) = r.id::text
                    and split_part(o.name, '/', 2) = 'gestao' and split_part(o.name, '/', 4) = seg::text
                    and split_part(o.name, '/', 5) like 'estoque_linha\_\_%') then
      falta := falta || 'o estoque atualizado'::text;
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'relatorios' and split_part(o.name, '/', 1) = r.id::text
                    and split_part(o.name, '/', 2) = 'gestao' and split_part(o.name, '/', 4) = seg::text
                    and split_part(o.name, '/', 5) like 'crediario_semana\_\_%') then
      falta := falta || 'o crediário atualizado (se vende no crediário)'::text;
    end if;
    continue when coalesce(array_length(falta, 1), 0) = 0;
    select array_agg(distinct f.id) into pessoas from perfis f
     where f.portal_id = r.id and f.papel <> 'equipe' and exists (select 1 from push_assinaturas a where a.user_id = f.id);
    continue when pessoas is null;
    msg := 'Hoje é o último dia para mandar o caixa e os relatórios da semana. Falta: '
        || case when array_length(falta, 1) = 1 then falta[1]
                else array_to_string(falta[1:array_length(falta, 1) - 1], ', ') || ' e ' || falta[array_length(falta, 1)] end
        || '. Mandando hoje, a sua análise da semana chega na segunda. Sem isso, ela só vem na próxima semana.';
    if not dry then perform avisar_lojas(msg, '/envios', pessoas); end if;
    enviados := enviados + array_length(pessoas, 1);
  end loop;
  return enviados;
end;
$$;
revoke all on function public.lembrete_fecha_semana(boolean) from public, anon, authenticated;

-- Sábado às 10h e às 16h (Recife), só para quem ainda tem algo faltando.
select cron.schedule('fecha-semana-manha', '0 13 * * 6', 'select public.lembrete_fecha_semana()');
select cron.schedule('fecha-semana-tarde', '0 19 * * 6', 'select public.lembrete_fecha_semana()');
