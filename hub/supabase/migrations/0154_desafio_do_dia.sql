-- Desafio do dia: a gestão lança um desafio novo que vale pontos para todo mundo; a equipe vê ao abrir o link
-- e marca quantas vezes cumpriu. Cada ação vale uma quantidade de pontos (e pode ter limite por dia).

create table if not exists public.loja_desafios (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  loja       text,                       -- null = todas as lojas do portal
  dia        date not null,
  modelo     text not null default 'livre',
  titulo     text not null,
  descricao  text not null default '',
  unidade    text not null,              -- ex.: "cada venda com 3 peças ou mais"
  pontos     int not null check (pontos > 0),
  limite     int check (limite is null or limite > 0),
  created_at timestamptz not null default now()
);
create index if not exists loja_desafios_dia on public.loja_desafios (portal_id, dia);
alter table public.loja_desafios enable row level security;
drop policy if exists loja_desafios_loja on public.loja_desafios;
create policy loja_desafios_loja on public.loja_desafios for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

create table if not exists public.loja_desafio_feitos (
  desafio_id uuid not null references public.loja_desafios (id) on delete cascade,
  pessoa_id  uuid not null references public.loja_equipe (id) on delete cascade,
  qtd        int not null default 0 check (qtd >= 0),
  updated_at timestamptz not null default now(),
  primary key (desafio_id, pessoa_id)
);
alter table public.loja_desafio_feitos enable row level security;
drop policy if exists loja_desafio_feitos_loja on public.loja_desafio_feitos;
create policy loja_desafio_feitos_loja on public.loja_desafio_feitos for all
  using (exists (select 1 from public.loja_desafios d where d.id = desafio_id and public.pode_ver(d.portal_id)))
  with check (exists (select 1 from public.loja_desafios d where d.id = desafio_id and public.pode_ver(d.portal_id)));

alter table public.loja_pontos drop constraint if exists loja_pontos_tipo_check;
alter table public.loja_pontos add constraint loja_pontos_tipo_check check (tipo in ('missao', 'estrela', 'indicacao', 'semana', 'clientes', 'caixa', 'destaque', 'desafio', 'resgate', 'ajuste'));

-- Excluir o desafio tira os pontos que ele deu.
create or replace function public.trg_desafio_excluido() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from loja_pontos where tipo = 'desafio' and ref = old.id::text;
  return old;
end $$;
drop trigger if exists desafio_excluido on public.loja_desafios;
create trigger desafio_excluido after delete on public.loja_desafios for each row execute function public.trg_desafio_excluido();

-- Aviso no celular quando a gestão lança o desafio do dia (só quem ligou os avisos).
create or replace function public.trg_aviso_desafio() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_equipe() and new.dia = (now() at time zone 'America/Recife')::date then
    perform avisar_portal(new.portal_id, 'desafio:' || new.id::text, 'Desafio de hoje: ' || new.titulo || '. ' || new.pontos || ' pontos por ' || new.unidade || '.', '/inicio', new.loja);
  end if;
  return new;
end $$;
drop trigger if exists aviso_desafio on public.loja_desafios;
create trigger aviso_desafio after insert on public.loja_desafios for each row execute function public.trg_aviso_desafio();

-- Os desafios de hoje da pessoa, com quantas vezes ela já cumpriu.
create or replace function public.vez_desafios(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date;
begin
  select * into q from public.vez_quem(p_token); if not found then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'titulo', d.titulo, 'descricao', d.descricao, 'unidade', d.unidade, 'pontos', d.pontos, 'limite', d.limite,
      'feitos', coalesce((select f.qtd from loja_desafio_feitos f where f.desafio_id = d.id and f.pessoa_id = q.id), 0)) order by d.created_at)
    from loja_desafios d where d.portal_id = q.portal_id and d.dia = hoje and (d.loja is null or d.loja = q.loja)), '[]'::jsonb);
end $$;

-- Soma ou tira uma ação do desafio de hoje (delta 1 ou -1) e acerta os pontos da pessoa.
create or replace function public.vez_desafio_marcar(p_token uuid, p_id uuid, p_delta int) returns int
language plpgsql security definer set search_path = public as $$
declare q record; d record; hoje date := (now() at time zone 'America/Recife')::date; novo int;
begin
  select * into q from public.vez_quem(p_token); if not found then return -1; end if;
  select * into d from loja_desafios where id = p_id and portal_id = q.portal_id and dia = hoje and (loja is null or loja = q.loja);
  if not found then return -1; end if;
  insert into loja_desafio_feitos (desafio_id, pessoa_id, qtd) values (p_id, q.id, greatest(0, least(coalesce(d.limite, 9999), p_delta)))
    on conflict (desafio_id, pessoa_id) do update set qtd = greatest(0, least(coalesce(d.limite, 9999), loja_desafio_feitos.qtd + p_delta)), updated_at = now()
    returning qtd into novo;
  if novo > 0 then
    insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
      values (q.portal_id, q.id, d.dia, 'desafio', novo * d.pontos, p_id::text, left('Desafio: ' || d.titulo, 80))
      on conflict (pessoa_id, tipo, ref) do update set pontos = excluded.pontos;
  else
    delete from loja_pontos where pessoa_id = q.id and tipo = 'desafio' and ref = p_id::text;
  end if;
  return novo;
end $$;

do $$ declare f text; begin
  foreach f in array array['vez_desafios(uuid)', 'vez_desafio_marcar(uuid,uuid,int)'] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;
