-- Avisos no celular para as lojas: lembretes diários (bom dia e caixa do dia) no lugar do WhatsApp.
-- Quem não ligou os avisos no aparelho não recebe nada (a permissão é de cada pessoa).

create or replace function public.push_destinos_lojas(p uuid[]) returns table (id uuid, endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = public as $$
  select a.id, a.endpoint, a.p256dh, a.auth from push_assinaturas a join perfis f on f.id = a.user_id where f.papel <> 'equipe' and a.user_id = any (p);
$$;
revoke all on function public.push_destinos_lojas(uuid[]) from public, anon, authenticated;
grant execute on function public.push_destinos_lojas(uuid[]) to service_role;

-- Manda um aviso para as pessoas das lojas (função "avisar", com a lista em para_lojas).
create or replace function public.avisar_lojas(texto text, link text, pessoas uuid[]) returns void
language plpgsql security definer set search_path = public, vault as $$
declare chave text;
begin
  if pessoas is null or array_length(pessoas, 1) is null then return; end if;
  select decrypted_secret into chave from vault.decrypted_secrets where name = 'aviso_chave';
  if chave is null then return; end if;
  perform net.http_post(
    url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/avisar',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', chave),
    body := jsonb_build_object('texto', texto, 'link', link, 'para_lojas', to_jsonb(pessoas))
  );
end;
$$;
revoke all on function public.avisar_lojas(text, text, uuid[]) from public, anon, authenticated;

-- Os lembretes do dia. tipo = 'manha' (bom dia) ou 'caixa' (caixa de hoje ainda não lançado). dry = só conta, não manda.
create or replace function public.lembretes_lojas(tipo text, dry boolean default false) returns integer
language plpgsql security definer set search_path = public as $$
declare
  hoje date := (now() at time zone 'America/Recife')::date;
  r record; pessoas uuid[]; enviados int := 0; faltam text[]; l text;
begin
  if extract(dow from hoje) = 0 then return 0; end if; -- domingo não tem lembrete
  if tipo = 'manha' then
    select array_agg(distinct f.id) into pessoas from perfis f join portais p on p.id = f.portal_id
     where f.papel <> 'equipe' and p.ativo and p.tipo <> 'Curso' and exists (select 1 from push_assinaturas a where a.user_id = f.id);
    if not dry then perform avisar_lojas('Bom dia! Abra o portal: a sua meta de hoje e a sua rotina já estão no Início.', '/inicio', pessoas); end if;
    return coalesce(array_length(pessoas, 1), 0);
  end if;
  if tipo = 'caixa' then
    for r in select p.id, p.lojas, coalesce(p.menu_oculto, '{}') oc from portais p where p.ativo and p.tipo <> 'Curso' and not (coalesce(p.menu_oculto, '{}') @> array['gestao']) loop
      if coalesce(array_length(r.lojas, 1), 0) > 1 then
        faltam := array(select x from unnest(r.lojas) x where not exists (select 1 from loja_caixa c where c.portal_id = r.id and c.dia = hoje and c.loja = x));
      else
        faltam := case when exists (select 1 from loja_caixa c where c.portal_id = r.id and c.dia = hoje) then '{}' else array['']::text[] end;
      end if;
      continue when coalesce(array_length(faltam, 1), 0) = 0;
      -- pessoas do portal com avisos ligados; quem tem acesso travado numa loja só recebe se for a loja que falta
      select array_agg(distinct f.id) into pessoas from perfis f
       where f.portal_id = r.id and f.papel <> 'equipe' and exists (select 1 from push_assinaturas a where a.user_id = f.id)
         and (f.loja_acesso is null or f.loja_acesso = any (faltam));
      continue when pessoas is null;
      l := case when faltam[1] = '' then '' when array_length(faltam, 1) = 1 then ' da ' || faltam[1] else 's: ' || array_to_string(faltam, ' e ') end;
      if not dry then
        perform avisar_lojas('O caixa' || case when faltam[1] = '' then '' else l end || ' de hoje ainda não foi lançado. Lance agora, leva 2 minutos.', '/gestao/caixa', pessoas);
      end if;
      enviados := enviados + array_length(pessoas, 1);
    end loop;
    return enviados;
  end if;
  return 0;
end;
$$;
revoke all on function public.lembretes_lojas(text, boolean) from public, anon, authenticated;
