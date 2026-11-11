-- Lojinha de resgate: os pontos da gamificação também podem ser trocados por mimos (garrafinha, maquiagem, skincare,
-- brindes das marcas), de 100 em 100 pontos. Roupa só pelo voucher de R$ 500 (500 pontos).

create table if not exists public.loja_premios (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  nome       text not null,
  descricao  text not null default '',
  pontos     int not null check (pontos > 0 and pontos % 100 = 0),
  foto       text,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists loja_premios_portal on public.loja_premios (portal_id);
alter table public.loja_premios enable row level security;
drop policy if exists loja_premios_loja on public.loja_premios;
create policy loja_premios_loja on public.loja_premios for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

create table if not exists public.loja_resgates (
  id          uuid primary key default gen_random_uuid(),
  portal_id   uuid not null references public.portais (id) on delete cascade,
  pessoa_id   uuid not null references public.loja_equipe (id) on delete cascade,
  premio_nome text not null,
  pontos      int not null,
  status      text not null default 'pedido' check (status in ('pedido', 'entregue')),
  created_at  timestamptz not null default now(),
  entregue_em timestamptz
);
create index if not exists loja_resgates_portal on public.loja_resgates (portal_id, status);
alter table public.loja_resgates enable row level security;
drop policy if exists loja_resgates_loja on public.loja_resgates;
create policy loja_resgates_loja on public.loja_resgates for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Cancelar um pedido devolve os pontos.
create or replace function public.trg_resgate_cancelado() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from loja_pontos where tipo = 'resgate' and ref = old.id::text;
  return old;
end $$;
drop trigger if exists resgate_cancelado on public.loja_resgates;
create trigger resgate_cancelado after delete on public.loja_resgates for each row execute function public.trg_resgate_cancelado();

-- A lojinha vista pela equipe (link pessoal): o saldo, os prêmios e os pedidos dela.
create or replace function public.vez_lojinha(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q record;
begin
  select * into q from public.vez_quem(p_token); if not found then return null; end if;
  return jsonb_build_object(
    'saldo', (select coalesce(sum(pontos), 0) from loja_pontos where pessoa_id = q.id),
    'premios', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'pontos', p.pontos, 'foto', p.foto) order by p.pontos, p.nome)
      from loja_premios p where p.portal_id = q.portal_id and p.ativo), '[]'::jsonb),
    'meus', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'nome', r.premio_nome, 'pontos', r.pontos, 'status', r.status, 'em', r.created_at) order by r.created_at desc)
      from (select * from loja_resgates where pessoa_id = q.id order by created_at desc limit 6) r), '[]'::jsonb));
end $$;

-- Resgata um prêmio: tira os pontos do saldo e cria o pedido para a gestora entregar.
create or replace function public.vez_resgatar(p_token uuid, p_premio uuid) returns text
language plpgsql security definer set search_path = public as $$
declare q record; pr record; saldo int; rid uuid;
begin
  select * into q from public.vez_quem(p_token); if not found then return 'link'; end if;
  select * into pr from loja_premios where id = p_premio and portal_id = q.portal_id and ativo; if not found then return 'premio'; end if;
  select coalesce(sum(pontos), 0) into saldo from loja_pontos where pessoa_id = q.id;
  if saldo < pr.pontos then return 'saldo'; end if;
  insert into loja_resgates (portal_id, pessoa_id, premio_nome, pontos) values (q.portal_id, q.id, pr.nome, pr.pontos) returning id into rid;
  insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
    values (q.portal_id, q.id, (now() at time zone 'America/Recife')::date, 'resgate', -pr.pontos, rid::text, 'Resgatou: ' || pr.nome);
  return 'ok';
end $$;

do $$ declare f text; begin
  foreach f in array array['vez_lojinha(uuid)', 'vez_resgatar(uuid,uuid)'] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
