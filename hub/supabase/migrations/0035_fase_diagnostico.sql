-- Fase do Diagnóstico: quando a loja termina de mandar tudo (Dados da loja + equipe), o prazo de 5 dias úteis começa a contar.
alter table public.portal_entrada add column if not exists dados_enviados_em timestamptz;

create or replace function public.marcar_dados_enviados() returns void
language sql security definer set search_path = public as $$
  insert into public.portal_entrada (portal_id, dados_enviados_em)
  select public.meu_portal(), now() where public.meu_portal() is not null
  on conflict (portal_id) do update
    set dados_enviados_em = coalesce(portal_entrada.dados_enviados_em, now()), updated_at = now()
$$;
revoke execute on function public.marcar_dados_enviados() from public, anon;
grant execute on function public.marcar_dados_enviados() to authenticated;

-- Aniversário da cliente (dona ou dono da loja), para a equipe preparar algo com antecedência.
alter table public.portais add column if not exists aniversario date;
