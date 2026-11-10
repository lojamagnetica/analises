-- Acesso de envios travado em uma loja do portal (ex.: a vendedora da For Men só vê o caixa da For Men).
alter table public.perfis add column if not exists loja_acesso text;

create or replace function public.loja_do_acesso_ok(l text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    public.is_equipe() or (select p.loja_acesso is null or p.loja_acesso = coalesce(l, '') from public.perfis p where p.id = auth.uid()),
    true)
$$;

drop policy if exists caixa_so_da_loja on public.loja_caixa;
create policy caixa_so_da_loja on public.loja_caixa as restrictive for all using (public.loja_do_acesso_ok(loja)) with check (public.loja_do_acesso_ok(loja));
drop policy if exists caixa_itens_so_da_loja on public.loja_caixa_itens;
create policy caixa_itens_so_da_loja on public.loja_caixa_itens as restrictive for all using (public.loja_do_acesso_ok(loja)) with check (public.loja_do_acesso_ok(loja));
