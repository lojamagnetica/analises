-- Webinar (Hub da empresa, só a equipe): criativos, funis com um link por parceiro e os leads com a origem.
-- O link do parceiro passa pelo Hub (/w?p=apelido): conta o clique e manda para o formulário do Respondi com a origem na URL.
set lock_timeout = '8s';

create table if not exists public.webinar_parceiros (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  apelido    text not null unique check (apelido ~ '^[a-z0-9-]{2,40}$'),
  contato    text not null default '',
  obs        text not null default '',
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.webinar_parceiros enable row level security;
create policy webinar_parceiros_equipe on public.webinar_parceiros for all using (public.is_equipe()) with check (public.is_equipe());

create table if not exists public.webinar_cliques (
  id         uuid primary key default gen_random_uuid(),
  apelido    text not null,
  em         timestamptz not null default now()
);
create index if not exists webinar_cliques_apelido on public.webinar_cliques (apelido);
alter table public.webinar_cliques enable row level security;
create policy webinar_cliques_equipe on public.webinar_cliques for all using (public.is_equipe()) with check (public.is_equipe());

create table if not exists public.webinar_leads (
  id            uuid primary key default gen_random_uuid(),
  chave         text not null unique,          -- para não duplicar na nova importação
  origem        text not null default 'direto', -- apelido do parceiro ou "direto"
  nome          text,
  whatsapp      text,
  email         text,
  instagram     text,
  respondido_em timestamptz,
  extras        jsonb not null default '{}'::jsonb,
  importado_em  timestamptz not null default now()
);
create index if not exists webinar_leads_origem on public.webinar_leads (origem);
alter table public.webinar_leads enable row level security;
create policy webinar_leads_equipe on public.webinar_leads for all using (public.is_equipe()) with check (public.is_equipe());

create table if not exists public.webinar_criativos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  tipo       text not null default '',
  arquivo    text,          -- caminho no bucket webinar
  link       text,          -- ou um link (Canva, Drive)
  obs        text not null default '',
  created_at timestamptz not null default now()
);
alter table public.webinar_criativos enable row level security;
create policy webinar_criativos_equipe on public.webinar_criativos for all using (public.is_equipe()) with check (public.is_equipe());

insert into storage.buckets (id, name, public, file_size_limit)
values ('webinar', 'webinar', false, 104857600)
on conflict (id) do nothing;
create policy webinar_arquivos_ver on storage.objects for select to authenticated using (bucket_id = 'webinar' and public.is_equipe());
create policy webinar_arquivos_subir on storage.objects for insert to authenticated with check (bucket_id = 'webinar' and public.is_equipe());
create policy webinar_arquivos_apagar on storage.objects for delete to authenticated using (bucket_id = 'webinar' and public.is_equipe());

-- O link do parceiro: conta o clique e devolve para onde mandar (o formulário com a origem na URL).
create or replace function public.webinar_clique(p_apelido text) returns text
language plpgsql security definer set search_path = public as $$
declare destino text; a text := lower(coalesce(p_apelido, ''));
begin
  select valor->>'formulario' into destino from public.hub_config where chave = 'webinar';
  if destino is null or destino = '' then return null; end if;
  if a <> '' and not exists (select 1 from public.webinar_parceiros where apelido = a and ativo) then a := ''; end if;
  insert into public.webinar_cliques (apelido) values (coalesce(nullif(a, ''), 'direto'));
  return destino || case when position('?' in destino) > 0 then '&' else '?' end
    || 'utm_source=' || coalesce(nullif(a, ''), 'direto') || '&utm_medium=parceria&utm_campaign=webinar';
end $$;
revoke execute on function public.webinar_clique(text) from public;
grant execute on function public.webinar_clique(text) to anon, authenticated;
