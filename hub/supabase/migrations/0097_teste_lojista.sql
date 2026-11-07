-- Teste do lojista (dono, sócios e gerente): perfil, prontidão e habilidades. Só a equipe vê as respostas e o índice.
-- A pessoa responde pelo link (token), sem login. O conteúdo das perguntas fica em metodo (chave 'lojista'), fora do repositório.
set lock_timeout = '8s';

create table if not exists public.lojista_testes (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portais(id) on delete cascade,
  nome text not null,
  papel text not null default 'socio' check (papel in ('socio', 'gerente')),
  token uuid not null unique default gen_random_uuid(),
  respostas jsonb,
  resultado jsonb,
  respondido_em timestamptz,
  olhar jsonb not null default '[]'::jsonb,
  criado_por text,
  created_at timestamptz not null default now()
);
create index if not exists lojista_testes_portal on public.lojista_testes (portal_id);

alter table public.lojista_testes enable row level security;
drop policy if exists lojista_testes_equipe on public.lojista_testes;
create policy lojista_testes_equipe on public.lojista_testes for all using (public.is_equipe()) with check (public.is_equipe());

-- Abre o teste pelo link: nome, loja e perguntas. Se já respondeu, só avisa.
create or replace function public.lojista_abrir(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', split_part(t.nome, ' ', 1),
    'papel', t.papel,
    'loja', p.loja,
    'respondido', t.respondido_em is not null,
    'conteudo', case when t.respondido_em is null then (select dados from public.metodo where chave = 'lojista') end)
  from public.lojista_testes t join public.portais p on p.id = t.portal_id
  where p_token is not null and t.token = p_token
$$;

-- Guarda as respostas (e o resultado calculado na tela). Só vale uma vez por link.
create or replace function public.lojista_responder(p_token uuid, p_respostas jsonb, p_resultado jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_token is null or p_respostas is null or jsonb_typeof(p_respostas) <> 'object' or pg_column_size(p_respostas) > 60000 then
    raise exception 'respostas inválidas';
  end if;
  update public.lojista_testes set respostas = p_respostas, resultado = p_resultado, respondido_em = now()
  where token = p_token and respondido_em is null;
  return found;
end;
$$;

-- Retorno para a pessoa: só as respostas e o conteúdo do espelho. O índice e a prontidão não saem daqui.
create or replace function public.lojista_retorno(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', split_part(t.nome, ' ', 1),
    'papel', t.papel,
    'respostas', t.respostas,
    'conteudo', (select dados from public.metodo where chave = 'lojista'))
  from public.lojista_testes t
  where p_token is not null and t.token = p_token and t.respondido_em is not null
$$;

revoke execute on function public.lojista_abrir(uuid) from public;
revoke execute on function public.lojista_responder(uuid, jsonb, jsonb) from public;
revoke execute on function public.lojista_retorno(uuid) from public;
grant execute on function public.lojista_abrir(uuid) to anon, authenticated;
grant execute on function public.lojista_responder(uuid, jsonb, jsonb) to anon, authenticated;
grant execute on function public.lojista_retorno(uuid) to anon, authenticated;
