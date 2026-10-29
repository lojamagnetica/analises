-- Missão da semana de CRM: uma força de venda unificada. Toda semana, uma missão igual para o time todo
-- (resgate de quem não compra há mais de 60 dias, lançamento, ação de uma linha, aniversariantes...), com o mesmo
-- modelo de mensagem e a mesma meta de mensagens por pessoa. A lista de clientes sai do sistema da loja.
-- Cada pessoa tem o seu link (sem entrar no Hub) para contar o que mandou, quem respondeu e quem comprou;
-- a gestora acompanha o retorno de cada uma. Toda mensagem traz quem fala: "Aqui é {consultora}, da {loja}".

create table if not exists public.loja_missoes (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  semana     date not null,              -- segunda-feira da semana
  foco       text not null default '',
  criterio   text not null default '',
  mensagem   text not null default '',
  meta       integer not null default 20, -- mensagens por pessoa na semana
  obs        text not null default '',
  created_at timestamptz not null default now(),
  unique (portal_id, semana)
);
alter table public.loja_missoes enable row level security;
create policy loja_missoes_loja on public.loja_missoes for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

create table if not exists public.loja_missao_pessoas (
  id          uuid primary key default gen_random_uuid(),
  missao_id   uuid not null references public.loja_missoes (id) on delete cascade,
  portal_id   uuid not null references public.portais (id) on delete cascade,
  pessoa_id   uuid references public.loja_equipe (id) on delete set null,
  pessoa_nome text not null default '',
  token       uuid not null unique default gen_random_uuid(),
  enviadas    integer not null default 0,
  respostas   integer not null default 0,
  vendas      integer not null default 0,
  valor       numeric not null default 0,
  created_at  timestamptz not null default now(),
  unique (missao_id, pessoa_id)
);
create index if not exists loja_missao_pessoas_portal on public.loja_missao_pessoas (portal_id);
alter table public.loja_missao_pessoas enable row level security;
create policy loja_missao_pessoas_loja on public.loja_missao_pessoas for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- A vendedora abre a missão pelo link dela.
create or replace function public.missao_abrir(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('pessoa', split_part(x.pessoa_nome, ' ', 1), 'loja', p.loja, 'semana', m.semana, 'foco', m.foco, 'criterio', m.criterio,
    'mensagem', m.mensagem, 'meta', m.meta, 'obs', m.obs, 'enviadas', x.enviadas, 'respostas', x.respostas, 'vendas', x.vendas)
  from public.loja_missao_pessoas x join public.loja_missoes m on m.id = x.missao_id join public.portais p on p.id = x.portal_id
  where p_token is not null and x.token = p_token
$$;

-- +1 / -1 em mandei, respondeu ou comprou.
create or replace function public.missao_contar(p_token uuid, p_campo text, p_delta integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d integer := greatest(-1, least(1, p_delta)); r jsonb;
begin
  if p_campo not in ('enviadas', 'respostas', 'vendas') then return null; end if;
  update public.loja_missao_pessoas set
    enviadas = case when p_campo = 'enviadas' then greatest(0, least(enviadas + d, 500)) else enviadas end,
    respostas = case when p_campo = 'respostas' then greatest(0, least(respostas + d, 500)) else respostas end,
    vendas = case when p_campo = 'vendas' then greatest(0, least(vendas + d, 500)) else vendas end
  where p_token is not null and token = p_token
  returning jsonb_build_object('enviadas', enviadas, 'respostas', respostas, 'vendas', vendas) into r;
  return r;
end $$;

revoke execute on function public.missao_abrir(uuid) from public;
revoke execute on function public.missao_contar(uuid, text, integer) from public;
grant execute on function public.missao_abrir(uuid) to anon, authenticated;
grant execute on function public.missao_contar(uuid, text, integer) to anon, authenticated;

-- A consultora se apresenta nas mensagens dos tipos de cliente.
update public.metodo set dados = jsonb_set(dados, '{tipos}', (
  select jsonb_object_agg(k, jsonb_set(v, '{mensagem}', to_jsonb(replace(v->>'mensagem', 'Aqui é da {loja}.', 'Aqui é {consultora}, da {loja}.'))))
  from jsonb_each(dados->'tipos') e(k, v)))
where chave = 'clientes';
