-- Conteúdo liberado até uma data: a loja só vê os posts até portais.conteudo_ate (a equipe vê tudo).
-- Usado para abrir a campanha semana a semana (ex.: até o fim da 2ª semana).
alter table public.portais add column if not exists conteudo_ate date;

create or replace function public.conteudo_liberado(p_portal uuid, p_data date)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_equipe() or coalesce((select p_data <= p.conteudo_ate from public.portais p where p.id = p_portal), true)
$$;

drop policy if exists posts_tudo on public.loja_posts;
create policy posts_tudo on public.loja_posts for all
  using (public.pode_ver(portal_id) and public.conteudo_liberado(portal_id, data))
  with check (public.pode_ver(portal_id));

drop policy if exists loja_posts_conteudo on public.loja_posts;
create policy loja_posts_conteudo on public.loja_posts for all
  using (public.pode_conteudo(portal_id) and public.conteudo_liberado(portal_id, data))
  with check (public.pode_conteudo(portal_id));
