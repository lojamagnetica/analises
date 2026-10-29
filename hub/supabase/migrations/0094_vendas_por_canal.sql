-- Vendas e tempo por canal: uma medição (ex.: 2 semanas) por loja, com um link de celular para a equipe lançar
-- durante o dia sem entrar no Hub. No Hub, a loja e a equipe da mentoria acompanham o resultado (venda por hora de cada canal).
set lock_timeout = '8s';

create table if not exists public.loja_canais_medicao (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  token      uuid not null unique default gen_random_uuid(),
  inicio     date not null,
  fim        date not null,
  canais     text[] not null default '{}',
  ativa      boolean not null default true,
  obs        text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists loja_canais_medicao_portal on public.loja_canais_medicao (portal_id);
alter table public.loja_canais_medicao enable row level security;
create policy loja_canais_medicao_loja on public.loja_canais_medicao for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

create table if not exists public.loja_canais_registro (
  id          uuid primary key default gen_random_uuid(),
  medicao_id  uuid not null references public.loja_canais_medicao (id) on delete cascade,
  portal_id   uuid not null references public.portais (id) on delete cascade,
  dia         date not null,
  canal       text not null,
  tipo        text not null check (tipo in ('venda', 'tempo')),
  valor       numeric not null default 0,
  pecas       integer not null default 0,
  minutos     integer not null default 0,
  quem        text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists loja_canais_registro_medicao on public.loja_canais_registro (medicao_id, dia);
alter table public.loja_canais_registro enable row level security;
create policy loja_canais_registro_loja on public.loja_canais_registro for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- O link do celular: abre a medição e os lançamentos de hoje.
create or replace function public.canais_abrir(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'loja', p.loja, 'inicio', m.inicio, 'fim', m.fim, 'canais', to_jsonb(m.canais), 'ativa', m.ativa,
    'hoje', (now() at time zone 'America/Recife')::date,
    'lancamentos', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'canal', r.canal, 'tipo', r.tipo, 'valor', r.valor, 'pecas', r.pecas, 'minutos', r.minutos, 'quem', r.quem, 'em', r.created_at) order by r.created_at desc)
      from public.loja_canais_registro r where r.medicao_id = m.id and r.dia = (now() at time zone 'America/Recife')::date), '[]'::jsonb))
  from public.loja_canais_medicao m join public.portais p on p.id = m.portal_id
  where p_token is not null and m.token = p_token
$$;

-- Lança uma venda (valor e peças) ou um tempo (minutos) num canal, no dia de hoje.
create or replace function public.canais_lancar(p_token uuid, p_canal text, p_tipo text, p_valor numeric, p_pecas integer, p_minutos integer, p_quem text) returns uuid
language plpgsql security definer set search_path = public as $$
declare m public.loja_canais_medicao; hoje date := (now() at time zone 'America/Recife')::date; novo uuid;
begin
  select * into m from public.loja_canais_medicao where p_token is not null and token = p_token;
  if m.id is null or not m.ativa then raise exception 'Este link não está aberto.'; end if;
  if hoje < m.inicio or hoje > m.fim then raise exception 'A medição vai de % a %.', to_char(m.inicio, 'DD/MM'), to_char(m.fim, 'DD/MM'); end if;
  if not (p_canal = any (m.canais)) then raise exception 'Canal fora da medição.'; end if;
  if p_tipo not in ('venda', 'tempo') then raise exception 'Tipo inválido.'; end if;
  insert into public.loja_canais_registro (medicao_id, portal_id, dia, canal, tipo, valor, pecas, minutos, quem)
  values (m.id, m.portal_id, hoje, p_canal, p_tipo,
    case when p_tipo = 'venda' then greatest(0, least(coalesce(p_valor, 0), 100000)) else 0 end,
    case when p_tipo = 'venda' then greatest(0, least(coalesce(p_pecas, 0), 500)) else 0 end,
    case when p_tipo = 'tempo' then greatest(0, least(coalesce(p_minutos, 0), 720)) else 0 end,
    left(coalesce(p_quem, ''), 40))
  returning id into novo;
  return novo;
end $$;

-- Apaga um lançamento de hoje feito por este link (quem lança pode errar).
create or replace function public.canais_apagar(p_token uuid, p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.loja_canais_registro r using public.loja_canais_medicao m
  where m.id = r.medicao_id and p_token is not null and m.token = p_token and r.id = p_id and r.dia = (now() at time zone 'America/Recife')::date;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke execute on function public.canais_abrir(uuid) from public;
revoke execute on function public.canais_lancar(uuid, text, text, numeric, integer, integer, text) from public;
revoke execute on function public.canais_apagar(uuid, uuid) from public;
grant execute on function public.canais_abrir(uuid) to anon, authenticated;
grant execute on function public.canais_lancar(uuid, text, text, numeric, integer, integer, text) to anon, authenticated;
grant execute on function public.canais_apagar(uuid, uuid) to anon, authenticated;
