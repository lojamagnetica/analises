-- Acesso só do caixa: a pessoa que fecha o caixa entra no portal da loja e vê só o Fechamento de caixa.
-- A equipe marca perfis.so_caixa em Portais › Editar › Quem acessa.
alter table public.perfis add column if not exists so_caixa boolean not null default false;

create or replace function public.so_caixa() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select so_caixa from public.perfis where id = auth.uid()), false)
$$;

-- Quem é só do caixa deixa de ver o resto do portal.
create or replace function public.pode_ver(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_equipe() or (p is not null and p = public.meu_portal() and not public.so_caixa())
$$;

-- O que o caixa precisa: o fechamento, o nome das vendedoras, a meta do mês e o portal.
create or replace function public.pode_caixa(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_equipe() or (p is not null and p = public.meu_portal())
$$;

alter policy caixa_loja on public.loja_caixa using (public.pode_caixa(portal_id)) with check (public.pode_caixa(portal_id));
create policy loja_equipe_caixa_ler on public.loja_equipe for select using (public.pode_caixa(portal_id));
create policy plano_mes_caixa_ler on public.loja_plano_mes for select using (public.pode_caixa(portal_id));
create policy portais_caixa_ler on public.portais for select using (public.pode_caixa(id));
