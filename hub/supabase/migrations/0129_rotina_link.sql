-- Formulário da rotina de gestão por link (sem login): cada portal tem um código próprio.
-- A loja responde, as respostas vão para personalizacao (etapa 20) e a CS é avisada.
set lock_timeout = '8s';

alter table public.portais add column if not exists rotina_token uuid not null default gen_random_uuid();
create unique index if not exists portais_rotina_token on public.portais (rotina_token);

create or replace function public.rotina_abrir(p_token uuid)
returns table (loja text, responsavel text, sem_equipe boolean, respostas jsonb)
language sql stable security definer set search_path = public as $$
  select p.loja, p.responsavel, coalesce(p.sem_equipe, false), coalesce(pe.respostas, '{}'::jsonb)
  from portais p left join personalizacao pe on pe.portal_id = p.id and pe.etapa = 20
  where p.rotina_token = p_token and p.ativo
$$;

create or replace function public.rotina_salvar(p_token uuid, p_respostas jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_portal uuid;
begin
  select id into v_portal from portais where rotina_token = p_token and ativo;
  if v_portal is null then raise exception 'Link inválido.'; end if;
  if jsonb_typeof(p_respostas) <> 'object' or length(p_respostas::text) > 60000 then raise exception 'Respostas inválidas.'; end if;
  insert into personalizacao (portal_id, etapa, respostas, concluida, updated_at) values (v_portal, 20, p_respostas, true, now())
    on conflict (portal_id, etapa) do update set respostas = excluded.respostas, concluida = true, updated_at = now();
  perform novidade_cs(v_portal, 'etapa', '📋 ' || nome_da_loja(v_portal) || ' respondeu a rotina de gestão', '/consultoria/planner?portal=' || v_portal);
end $$;

revoke all on function public.rotina_abrir(uuid) from public;
revoke all on function public.rotina_salvar(uuid, jsonb) from public;
grant execute on function public.rotina_abrir(uuid) to anon, authenticated;
grant execute on function public.rotina_salvar(uuid, jsonb) to anon, authenticated;
