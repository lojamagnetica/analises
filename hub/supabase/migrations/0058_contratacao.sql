-- Contratação: a vaga (do que o time precisa + a vaga), os candidatos (entrevista e teste) e o onboarding de quem entrou.
-- necessidade = { carencia, complementa, nao_encaixa }
-- vaga = { funcoes, habilidades, perfil, salario, carga, beneficios, requisitos }
-- entrevista = { observar: {chave: bool}, notas: {ponto: 1..5}, anotacoes: {pergunta: texto}, sobre_vaga: [ids] }
-- teste = { respostas: {n: indice}, valores: [..], abertas: {conquista, porque} } (o candidato responde pelo link, sem login)
create table if not exists public.loja_vagas (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  titulo      text not null,
  situacao    text not null default 'aberta',
  necessidade jsonb not null default '{}'::jsonb,
  vaga        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists loja_vagas_portal on public.loja_vagas (portal_id);
alter table public.loja_vagas enable row level security;
create policy vagas_loja on public.loja_vagas for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

create table if not exists public.loja_candidatos (
  id          uuid primary key default gen_random_uuid(),
  vaga_id     uuid not null references public.loja_vagas (id) on delete cascade,
  portal_id   uuid not null references public.portais (id) on delete cascade,
  nome        text not null,
  whatsapp    text not null default '',
  etapa       text not null default 'triagem',
  obs         text not null default '',
  entrevista  jsonb not null default '{}'::jsonb,
  teste_token uuid unique default gen_random_uuid(),
  teste       jsonb,
  teste_em    timestamptz,
  pessoa_id   uuid references public.loja_equipe (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists loja_candidatos_vaga on public.loja_candidatos (vaga_id);
alter table public.loja_candidatos enable row level security;
create policy candidatos_loja on public.loja_candidatos for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

create table if not exists public.loja_onboarding (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  pessoa_id   uuid not null references public.loja_equipe (id) on delete cascade,
  inicio      date not null default current_date,
  feitos      jsonb not null default '{}'::jsonb,
  notas       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists loja_onboarding_portal on public.loja_onboarding (portal_id);
alter table public.loja_onboarding enable row level security;
create policy onboarding_loja on public.loja_onboarding for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- O teste do candidato pelo link (sem login): abre só se ainda não respondeu.
create or replace function public.candidato_abrir(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('nome', c.nome, 'loja', p.loja)
  from loja_candidatos c join portais p on p.id = c.portal_id
  where c.teste_token = p_token and c.teste is null;
$$;

create or replace function public.candidato_enviar(p_token uuid, p_teste jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if length(coalesce(p_teste, '{}'::jsonb)::text) > 20000 then raise exception 'Resposta grande demais'; end if;
  update loja_candidatos set teste = p_teste, teste_em = now(), updated_at = now(),
    etapa = case when etapa in ('triagem', 'entrevista', 'teste') then 'teste' else etapa end
  where teste_token = p_token and teste is null;
  return found;
end $$;
grant execute on function public.candidato_abrir(uuid) to anon, authenticated;
grant execute on function public.candidato_enviar(uuid, jsonb) to anon, authenticated;
