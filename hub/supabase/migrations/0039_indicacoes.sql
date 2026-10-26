-- Indique uma loja: a lojista indica uma loja amiga e a indicação vira lead no Comercial (origem Indicação).
-- A loja vê só o nome e a situação simplificada das indicações dela. Cidade e motivo vão para as observações do lead.
-- O prêmio da indicação é um texto em hub_config (chave indique_premio), editado pela equipe.
set lock_timeout = '8s';

alter table public.leads add column if not exists indicado_por uuid references public.portais (id) on delete set null;
create index if not exists leads_indicado_por on public.leads (indicado_por);

create or replace function public.indicar_loja(p_nome text, p_loja text, p_whatsapp text, p_instagram text, p_cidade text, p_motivo text, p_portal uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  alvo uuid := public.portal_alvo(p_portal);
  novo uuid;
  obs text;
begin
  if alvo is null then raise exception 'Portal não encontrado.'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Preencha o nome de quem você está indicando.'; end if;
  if length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 then raise exception 'Preencha o WhatsApp com DDD.'; end if;
  obs := concat_ws(E'\n',
    'Indicada pelo Hub por ' || (select loja from public.portais where id = alvo) || '.',
    case when coalesce(trim(p_cidade), '') <> '' then 'Cidade: ' || left(trim(p_cidade), 120) end,
    case when coalesce(trim(p_motivo), '') <> '' then 'Por que indicou: ' || left(trim(p_motivo), 1000) end);
  insert into public.leads (nome, loja, whatsapp, instagram, origem, etapa, indicado_por, obs, criado_por)
  values (left(trim(p_nome), 200), nullif(left(trim(coalesce(p_loja, '')), 200), ''), left(trim(p_whatsapp), 60),
          nullif(left(trim(coalesce(p_instagram, '')), 200), ''), 'Indicação', 'Novo', alvo, obs, 'Hub da loja')
  returning id into novo;
  return novo;
end $$;
revoke execute on function public.indicar_loja(text, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.indicar_loja(text, text, text, text, text, text, uuid) to authenticated;

-- Nome e situação simplificada das indicações da loja.
create or replace function public.minhas_indicacoes(p_portal uuid default null)
returns table (nome text, loja text, situacao text, criada_em timestamptz)
language sql stable security definer set search_path = public as $$
  select l.nome, l.loja,
         case l.etapa when 'Novo' then 'Recebida' when 'Conversando' then 'Em conversa' when 'Proposta' then 'Em conversa'
                      when 'Fechou' then 'Entrou ✅' else 'Não fechou' end,
         l.created_at
  from public.leads l
  where l.indicado_por = public.portal_alvo(p_portal)
  order by l.created_at desc
$$;
revoke execute on function public.minhas_indicacoes(uuid) from public, anon;
grant execute on function public.minhas_indicacoes(uuid) to authenticated;

-- A lista da tela, com o id para editar e retirar. Indicação retirada pela loja não aparece mais
-- para ela (fica no Comercial como Perdido).
create or replace function public.indicacoes_da_loja(p_portal uuid default null)
returns table (id uuid, nome text, loja text, whatsapp text, instagram text, situacao text, criada_em timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id, l.nome, l.loja, l.whatsapp, l.instagram,
         case l.etapa when 'Novo' then 'Recebida' when 'Conversando' then 'Em conversa' when 'Proposta' then 'Em conversa'
                      when 'Fechou' then 'Entrou ✅' else 'Não fechou' end,
         l.created_at
  from public.leads l
  where l.indicado_por = public.portal_alvo(p_portal) and coalesce(l.motivo_perda, '') <> 'A loja retirou a indicação'
  order by l.created_at desc
$$;
revoke execute on function public.indicacoes_da_loja(uuid) from public, anon;
grant execute on function public.indicacoes_da_loja(uuid) to authenticated;

-- Enquanto a indicação está como Recebida (a equipe ainda não chamou), a loja pode corrigir os dados ou retirar.
create or replace function public.editar_indicacao(p_id uuid, p_nome text, p_loja text, p_whatsapp text, p_instagram text, p_portal uuid default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_nome), '') = '' then raise exception 'Preencha o nome.'; end if;
  if length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 then raise exception 'Preencha o WhatsApp com DDD.'; end if;
  update public.leads set nome = left(trim(p_nome), 200), loja = nullif(left(trim(coalesce(p_loja, '')), 200), ''),
         whatsapp = left(trim(p_whatsapp), 60), instagram = nullif(left(trim(coalesce(p_instagram, '')), 200), ''), updated_at = now()
  where id = p_id and indicado_por = public.portal_alvo(p_portal) and etapa = 'Novo';
  if not found then raise exception 'A equipe já está conversando com ela. Para mudar, fale com a Camilla.'; end if;
end $$;
revoke execute on function public.editar_indicacao(uuid, text, text, text, text, uuid) from public, anon;
grant execute on function public.editar_indicacao(uuid, text, text, text, text, uuid) to authenticated;

create or replace function public.retirar_indicacao(p_id uuid, p_portal uuid default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.leads set etapa = 'Perdido', motivo_perda = 'A loja retirou a indicação', etapa_em = now(), updated_at = now()
  where id = p_id and indicado_por = public.portal_alvo(p_portal) and etapa = 'Novo';
  if not found then raise exception 'A equipe já está conversando com ela. Para mudar, fale com a Camilla.'; end if;
end $$;
revoke execute on function public.retirar_indicacao(uuid, uuid) from public, anon;
grant execute on function public.retirar_indicacao(uuid, uuid) to authenticated;
