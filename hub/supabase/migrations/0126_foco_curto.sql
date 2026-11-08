-- Contrato de Foco: uma versão curta para o Início (uma linha) e, dentro do Diagnóstico, o contrato completo
-- (resultado, indicador e os fundamentos que a loja está trabalhando).
set lock_timeout = '8s';

alter table public.fichas add column if not exists foco_curto text;

drop function if exists public.contrato_foco(uuid);
create function public.contrato_foco(p uuid)
returns table (resultado text, indicador text, de_acordo_em timestamptz, curto text, trabalhando text[])
language sql stable security definer set search_path = public as $$
  select f.resultado_n1, f.indicador, f.foco_de_acordo_em, f.foco_curto, coalesce(f.fundamentos_trabalhando, '{}')
  from fichas f where f.portal_id = p and public.pode_ver(p)
$$;
revoke all on function public.contrato_foco(uuid) from public, anon;
grant execute on function public.contrato_foco(uuid) to authenticated;
