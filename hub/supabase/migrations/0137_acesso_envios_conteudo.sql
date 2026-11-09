-- Acesso de envios com a área de Conteúdo: o ADM que também faz o conteúdo da loja (ex.: a Clara, da Eleganza).
-- Só a equipe liga (Portais › Editar › Quem acessa). Ela continua sem ver as outras áreas do portal.
set lock_timeout = '8s';
alter table public.perfis add column if not exists ve_conteudo boolean not null default false;

create or replace function public.pode_conteudo(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.pode_ver(p) or (p is not null and p = public.meu_portal() and coalesce((select ve_conteudo from public.perfis where id = auth.uid()), false))
$$;

drop policy if exists bio_tudo_conteudo on public.bio_paginas;
create policy bio_tudo_conteudo on public.bio_paginas for all using (public.pode_conteudo(portal_id)) with check (public.pode_conteudo(portal_id));
drop policy if exists bio_cliques_conteudo on public.bio_cliques;
create policy bio_cliques_conteudo on public.bio_cliques for select using (exists (select 1 from public.bio_paginas b where b.id = bio_cliques.pagina_id and public.pode_conteudo(b.portal_id)));
drop policy if exists loja_acoes_conteudo on public.loja_acoes;
create policy loja_acoes_conteudo on public.loja_acoes for all using (public.pode_conteudo(portal_id)) with check (public.pode_conteudo(portal_id));
drop policy if exists loja_conteudo_conteudo on public.loja_conteudo;
create policy loja_conteudo_conteudo on public.loja_conteudo for all using (public.pode_conteudo(portal_id)) with check (public.pode_conteudo(portal_id));
drop policy if exists loja_posts_conteudo on public.loja_posts;
create policy loja_posts_conteudo on public.loja_posts for all using (public.pode_conteudo(portal_id)) with check (public.pode_conteudo(portal_id));
drop policy if exists extra_ler_conteudo on public.loja_analise_extra;
create policy extra_ler_conteudo on public.loja_analise_extra for select using (status = 'liberada' and public.pode_conteudo(portal_id));
drop policy if exists analise_ler_conteudo on public.loja_analise_perfil;
create policy analise_ler_conteudo on public.loja_analise_perfil for select using (status = 'liberada' and public.pode_conteudo(portal_id));
