-- Conferência do caixa no banco (a mesma do Hub, em lib/caixa.ts problemasDoCaixa): número faltando ou que não bate.
-- Entra no alerta de sábado junto com o que falta enviar.
set lock_timeout = '8s';

create or replace function public.caixa_com_problema(k public.loja_caixa, com_time boolean) returns boolean
language sql immutable set search_path = public as $$
  with v as (
    select coalesce(k.faturamento, 0) fat, coalesce(k.vendas, 0) vendas, coalesce(k.pecas, 0) pecas,
      (select coalesce(sum(x.value::numeric), 0) from jsonb_each_text(case when jsonb_typeof(k.pagamentos) = 'object' then k.pagamentos else '{}' end) x) pag,
      (select coalesce(sum((x->>'faturamento')::numeric), 0) from jsonb_array_elements(case when jsonb_typeof(k.vendedoras) = 'array' then k.vendedoras else '[]' end) x) vend,
      (case when jsonb_typeof(k.vendedoras) = 'array' then jsonb_array_length(k.vendedoras) else 0 end) nvend
  )
  select (fat > 0 and vendas = 0) or (vendas > 0 and pecas = 0) or (pecas > 0 and pecas < vendas)
      or (fat > 0 and pag = 0 and coalesce(k.origem, '') <> 'canais') or (pag > 0 and abs(pag - fat) > 1)
      or (com_time and fat > 0 and nvend = 0) or (nvend > 0 and abs(vend - fat) > 1)
  from v;
$$;

create or replace function public.lembrete_fecha_semana(dry boolean default false) returns integer
language plpgsql security definer set search_path = public, storage as $$
declare
  hoje date := (now() at time zone 'America/Recife')::date;
  seg date := hoje - ((extract(isodow from hoje)::int) - 1);
  r record; pessoas uuid[]; enviados int := 0; dias int; erros int; falta text[]; msg text;
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
    -- dias da semana lançados com número faltando ou que não bate
    select count(*) into erros from loja_caixa k where k.portal_id = r.id and k.dia between seg and hoje
       and caixa_com_problema(k, exists (select 1 from loja_equipe e where e.portal_id = r.id and e.ativo));
    if erros = 1 then falta := falta || 'corrigir 1 dia do caixa com número faltando ou que não bate'::text;
    elsif erros > 1 then falta := falta || ('corrigir ' || erros || ' dias do caixa com número faltando ou que não bate'); end if;
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
