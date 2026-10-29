-- Área da mentora: o Conteúdo da casa passa a ser só de quem aprova (a Camilla), como o Meu estúdio (só a dona do documento).
drop policy if exists conteudo_casa_equipe on public.conteudo_casa;
drop policy if exists conteudo_casa_mentora on public.conteudo_casa;
create policy conteudo_casa_mentora on public.conteudo_casa for all to authenticated
  using (public.pode_aprovar()) with check (public.pode_aprovar());
