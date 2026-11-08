-- Contrato assinado: a equipe anexa o PDF e a loja vê (e baixa) no portal, em "Contrato e renovação".
-- arquivo = caminho no Storage (balde relatorios, pasta <portal_id>/contrato/).
-- A loja não apaga nem troca o contrato assinado: só a equipe.
set lock_timeout = '8s';

alter table public.contratos add column if not exists arquivo text;

drop function if exists public.meu_contrato(uuid);
create function public.meu_contrato(p_portal uuid default null)
returns table (id uuid, plano text, tipo text, meses int, inicio date, fim date, status text, renovacao_pedida boolean, arquivo text)
language sql stable security definer set search_path = public as $$
  select c.id, coalesce(pl.nome, 'Plano'), coalesce(pl.tipo, 'Mentoria'), pl.meses, c.inicio, c.fim, c.status,
         exists (select 1 from public.leads l where l.portal_id = c.portal_id and l.origem = 'Renovação' and l.etapa not in ('Fechou', 'Perdido')),
         c.arquivo
  from public.contratos c
  left join public.planos pl on pl.id = c.plano_id
  where c.portal_id = public.portal_alvo(p_portal)
  order by c.inicio desc nulls last, c.created_at desc
$$;
revoke execute on function public.meu_contrato(uuid) from public, anon;
grant execute on function public.meu_contrato(uuid) to authenticated;

create policy contrato_assinado_so_equipe_apaga on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'relatorios' or name not like '%/contrato/%' or public.is_equipe());
