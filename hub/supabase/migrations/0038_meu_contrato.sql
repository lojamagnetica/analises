-- Contrato e renovação no portal da loja. A tabela contratos continua só da equipe:
-- a loja lê pelo meu_contrato(), que devolve plano, início, fim e situação, sem valor e sem condição.
-- A equipe passa o portal aberto (p_portal); a loja sempre vê só o dela.
set lock_timeout = '8s';

create or replace function public.portal_alvo(p_portal uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select case when public.is_equipe() then coalesce(p_portal, public.meu_portal()) else public.meu_portal() end
$$;
revoke execute on function public.portal_alvo(uuid) from public, anon;
grant execute on function public.portal_alvo(uuid) to authenticated;

create or replace function public.meu_contrato(p_portal uuid default null)
returns table (id uuid, plano text, tipo text, meses int, inicio date, fim date, status text, renovacao_pedida boolean)
language sql stable security definer set search_path = public as $$
  select c.id, coalesce(pl.nome, 'Plano'), coalesce(pl.tipo, 'Mentoria'), pl.meses, c.inicio, c.fim, c.status,
         exists (select 1 from public.leads l where l.portal_id = c.portal_id and l.origem = 'Renovação' and l.etapa not in ('Fechou', 'Perdido'))
  from public.contratos c
  left join public.planos pl on pl.id = c.plano_id
  where c.portal_id = public.portal_alvo(p_portal)
  order by c.inicio desc nulls last, c.created_at desc
$$;
revoke execute on function public.meu_contrato(uuid) from public, anon;
grant execute on function public.meu_contrato(uuid) to authenticated;

-- "Quero conversar sobre renovar": vira um lead no Comercial (origem Renovação).
-- Se já existe um lead de renovação aberto para a loja, não cria outro e avisa.
create or replace function public.pedir_renovacao(p_portal uuid default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  alvo uuid := public.portal_alvo(p_portal);
  p record;
begin
  if alvo is null then raise exception 'Portal não encontrado.'; end if;
  if exists (select 1 from public.leads where portal_id = alvo and origem = 'Renovação' and etapa not in ('Fechou', 'Perdido')) then
    return 'ja_pedido';
  end if;
  select loja, responsavel, whatsapp into p from public.portais where id = alvo;
  insert into public.leads (nome, loja, whatsapp, origem, etapa, portal_id, obs, criado_por)
  values (coalesce(nullif(p.responsavel, ''), p.loja), p.loja, p.whatsapp, 'Renovação', 'Novo', alvo,
          'Pediu pelo Hub para conversar sobre a renovação.', 'Hub da loja');
  return 'pedido';
end $$;
revoke execute on function public.pedir_renovacao(uuid) from public, anon;
grant execute on function public.pedir_renovacao(uuid) to authenticated;
