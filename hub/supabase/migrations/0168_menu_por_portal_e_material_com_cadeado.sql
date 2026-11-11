-- Menu por portal (consultorias personalizadas) e materiais com cadeado. Tudo opcional: vazio = como sempre foi.
set lock_timeout = '8s';

-- Ordem do menu: ids de grupo (ex.: 'consultoria', 'gestao') e endereços (ex.: '/inicio', '/indique').
-- O que está na lista vem primeiro, nessa ordem; o resto fica abaixo, na ordem de sempre.
-- Endereço de uma página que fica dentro de um grupo (ex.: '/gestao/canais') sai do grupo e vira item do menu.
alter table public.portais add column if not exists menu_ordem text[] not null default '{}';

-- Nomes do menu: { "<id do grupo ou endereço>": "novo nome" }. Ex.: { "gestao": "Varejo" }.
alter table public.portais add column if not exists menu_rotulos jsonb not null default '{}'::jsonb;

-- Material com cadeado: liberado = false e liberado_em preenchido aparece para a loja só com o título e a data.
alter table public.consultoria_materiais add column if not exists liberado_em date;

-- A loja não lê a linha do material que não foi liberado (a regra de leitura continua a mesma).
-- Esta função entrega só o que o cadeado mostra: título, mês e data. Nunca o texto nem o arquivo.
create or replace function public.materiais_com_cadeado(p_portal uuid)
returns table (id uuid, titulo text, mes text, entrega_id uuid, liberado_em date)
language sql stable security definer set search_path = public as $$
  select m.id, m.titulo, m.mes, m.entrega_id, m.liberado_em
    from public.consultoria_materiais m
   where m.portal_id = p_portal and not m.liberado and m.liberado_em is not null
     and public.pode_ver(p_portal)
   order by m.created_at;
$$;
revoke all on function public.materiais_com_cadeado(uuid) from public, anon;
grant execute on function public.materiais_com_cadeado(uuid) to authenticated;
