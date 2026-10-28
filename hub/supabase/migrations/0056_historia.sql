-- A história da loja: a lojista preenche por um link único (sem login), antes de ter acesso ao Hub.
-- A Camilla liga a resposta ao portal, revisa e libera; aí a loja vê "Nossa história" no Hub.
-- token = a chave do link para continuar depois (fica no aparelho de quem preencheu).
-- respostas = { comeco, motivo, dificil, conquista, cliente, sentir, jeito, valores: [{nome, como}], futuro }
-- fotos = [{ caminho, ano, legenda }] no balde historias, pasta <token>/.
create table if not exists public.loja_historia (
  id          uuid primary key default gen_random_uuid(),
  token       uuid not null unique default gen_random_uuid(),
  portal_id   uuid references public.portais (id) on delete set null,
  loja        text not null default '',
  nome        text not null default '',
  whatsapp    text not null default '',
  respostas   jsonb not null default '{}'::jsonb,
  fotos       jsonb not null default '[]'::jsonb,
  enviado     boolean not null default false,
  liberado    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists loja_historia_portal on public.loja_historia (portal_id);
alter table public.loja_historia enable row level security;
-- A loja lê a sua depois de liberada; a equipe faz tudo.
create policy historia_ler on public.loja_historia for select using (public.is_equipe() or (liberado and public.pode_ver(portal_id)));
create policy historia_equipe on public.loja_historia for all using (public.is_equipe()) with check (public.is_equipe());

-- O formulário (sem login) abre e salva só pela chave do link.
create or replace function public.historia_abrir(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('loja', loja, 'nome', nome, 'whatsapp', whatsapp, 'respostas', respostas, 'fotos', fotos, 'enviado', enviado)
  from loja_historia where token = p_token and not liberado;
$$;

create or replace function public.historia_salvar(p_token uuid, p_loja text, p_nome text, p_whatsapp text, p_respostas jsonb, p_fotos jsonb, p_enviar boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if length(coalesce(p_respostas, '{}'::jsonb)::text) > 60000 or jsonb_array_length(coalesce(p_fotos, '[]'::jsonb)) > 20 then
    raise exception 'Resposta grande demais';
  end if;
  if p_token is null then
    insert into loja_historia (loja, nome, whatsapp, respostas, fotos, enviado)
    values (left(trim(p_loja), 120), left(trim(p_nome), 120), left(trim(p_whatsapp), 30), coalesce(p_respostas, '{}'::jsonb), coalesce(p_fotos, '[]'::jsonb), coalesce(p_enviar, false))
    returning token into t;
  else
    update loja_historia set loja = left(trim(p_loja), 120), nome = left(trim(p_nome), 120), whatsapp = left(trim(p_whatsapp), 30),
      respostas = coalesce(p_respostas, '{}'::jsonb), fotos = coalesce(p_fotos, '[]'::jsonb), enviado = enviado or coalesce(p_enviar, false), updated_at = now()
    where token = p_token and not liberado returning token into t;
  end if;
  return t;
end $$;
grant execute on function public.historia_abrir(uuid) to anon, authenticated;
grant execute on function public.historia_salvar(uuid, text, text, text, jsonb, jsonb, boolean) to anon, authenticated;

-- Fotos: balde privado, só imagem até 10 MB. Sobe quem tem a chave; vê a equipe ou a loja depois de liberada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('historias', 'historias', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create or replace function public.historia_pasta_ok(p_pasta text, p_ver boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from loja_historia h where h.token::text = p_pasta
    and (case when p_ver then public.is_equipe() or (h.liberado and public.pode_ver(h.portal_id)) else not h.liberado end));
$$;
grant execute on function public.historia_pasta_ok(text, boolean) to anon, authenticated;

create policy historias_subir on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'historias' and public.historia_pasta_ok((storage.foldername(name))[1], false));
create policy historias_ver on storage.objects for select to authenticated
  using (bucket_id = 'historias' and public.historia_pasta_ok((storage.foldername(name))[1], true));
create policy historias_equipe on storage.objects for delete to authenticated
  using (bucket_id = 'historias' and public.is_equipe());
