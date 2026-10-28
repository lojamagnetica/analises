-- A leitura da semana: a equipe olha os números da loja e escreve o que eles mostram e as 3 ações da semana.
-- Aparece no Início da loja. A loja marca as ações feitas (só isso, pela função leitura_marcar).
-- acoes = [{ t: texto, feita: bool }]
create table if not exists public.loja_leituras (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  semana      date not null,
  texto       text not null default '',
  acoes       jsonb not null default '[]'::jsonb,
  autor_nome  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (portal_id, semana)
);
alter table public.loja_leituras enable row level security;
create policy leituras_ler on public.loja_leituras for select using (public.pode_ver(portal_id));
create policy leituras_equipe on public.loja_leituras for all using (public.is_equipe()) with check (public.is_equipe());

create or replace function public.leitura_marcar(p_id uuid, p_idx int, p_feita boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update loja_leituras set acoes = jsonb_set(acoes, array[p_idx::text, 'feita'], to_jsonb(p_feita)), updated_at = now()
  where id = p_id and public.pode_ver(portal_id) and p_idx >= 0 and p_idx < jsonb_array_length(acoes);
end $$;
revoke all on function public.leitura_marcar(uuid, int, boolean) from public, anon;
grant execute on function public.leitura_marcar(uuid, int, boolean) to authenticated;
