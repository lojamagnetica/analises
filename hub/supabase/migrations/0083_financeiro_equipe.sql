-- O Financeiro passa para Nossa empresa: toda a equipe vê e lança.
drop policy if exists fin_fixas_mentora on public.fin_fixas;
drop policy if exists fin_lanc_mentora on public.fin_lancamentos;
drop policy if exists fin_config_mentora on public.fin_config;
drop policy if exists fin_fixas_equipe on public.fin_fixas;
drop policy if exists fin_lanc_equipe on public.fin_lancamentos;
drop policy if exists fin_config_equipe on public.fin_config;
create policy fin_fixas_equipe on public.fin_fixas for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
create policy fin_lanc_equipe on public.fin_lancamentos for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
create policy fin_config_equipe on public.fin_config for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
