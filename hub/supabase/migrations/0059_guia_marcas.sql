-- Guia das marcas e produtos: uma ficha por marca (moda) ou linha de produto (outros nichos).
-- Serve para o onboarding (estudo no dia 1 e quiz no dia 3) e para treinar a equipe.
create table if not exists public.loja_marcas (
  id           uuid primary key default gen_random_uuid(),
  portal_id    uuid not null references public.portais (id) on delete cascade,
  nome         text not null,
  foto         text,
  oque         text not null default '',
  para_quem    text not null default '',
  preco        text not null default '',
  diferenciais text not null default '',
  como_vender  text not null default '',
  perguntas    text not null default '',
  pecas        text not null default '',
  cuidados     text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists loja_marcas_portal on public.loja_marcas (portal_id);
alter table public.loja_marcas enable row level security;
create policy marcas_loja on public.loja_marcas for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- O link de estudo da pessoa nova (história + guia + quiz), sem login.
alter table public.loja_onboarding add column if not exists estudo_token uuid unique default gen_random_uuid();
alter table public.loja_onboarding add column if not exists quiz jsonb;
alter table public.loja_onboarding add column if not exists quiz_em timestamptz;

create or replace function public.estudo_abrir(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'pessoa', e.nome, 'loja', p.loja,
    'historia', (select jsonb_build_object('loja', h.loja, 'respostas', h.respostas) from loja_historia h where h.portal_id = o.portal_id and h.liberado order by h.updated_at desc limit 1),
    'marcas', coalesce((select jsonb_agg(to_jsonb(m) - 'portal_id' - 'created_at' - 'updated_at' order by m.created_at) from loja_marcas m where m.portal_id = o.portal_id), '[]'::jsonb))
  from loja_onboarding o join loja_equipe e on e.id = o.pessoa_id join portais p on p.id = o.portal_id
  where o.estudo_token = p_token;
$$;

create or replace function public.estudo_quiz(p_token uuid, p_resultado jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(p_resultado, '{}'::jsonb)::text) > 20000 then raise exception 'Resultado grande demais'; end if;
  update loja_onboarding set quiz = p_resultado, quiz_em = now(), feitos = feitos || '{"d2e": true}'::jsonb, updated_at = now()
  where estudo_token = p_token;
  return found;
end $$;
grant execute on function public.estudo_abrir(uuid) to anon, authenticated;
grant execute on function public.estudo_quiz(uuid, jsonb) to anon, authenticated;

-- Fotos das fichas: balde público (fotos de produto), pasta <portal_id>/. Sobe e apaga só quem vê o portal.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marcas', 'marcas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.marcas_pasta_ok(p_pasta text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return public.pode_ver(p_pasta::uuid);
exception when others then
  return false;
end $$;
grant execute on function public.marcas_pasta_ok(text) to authenticated;

create policy marcas_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'marcas' and public.marcas_pasta_ok((storage.foldername(name))[1]));
create policy marcas_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'marcas' and public.marcas_pasta_ok((storage.foldername(name))[1]));
