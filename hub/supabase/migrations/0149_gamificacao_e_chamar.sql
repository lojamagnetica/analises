-- Gamificação da Lista da vez (pontos, estrelas e vouchers) e o card "Clientes para chamar" no link pessoal.
-- Regras: cada missão do dia vale 10 pontos (marcada no mesmo dia); missões do dia completas = 1 estrela;
-- a cada 500 pontos, um voucher de R$ 500 em compras (acumulativo); semana com 80% ou mais dos atendimentos
-- com resultado marcado (mínimo de 5 atendimentos) = +50 pontos; indique e ganhe (nov e dez/2026) = +20 pontos.

alter table public.loja_missao_dia add column if not exists pontos int not null default 10;
alter table public.loja_vez_atend add column if not exists indicada_por uuid references public.loja_equipe (id) on delete set null;

create table if not exists public.loja_pontos (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  pessoa_id  uuid not null references public.loja_equipe (id) on delete cascade,
  dia        date not null,
  tipo       text not null check (tipo in ('missao', 'estrela', 'indicacao', 'semana', 'resgate', 'ajuste')),
  pontos     int not null,
  ref        text not null default '',
  texto      text not null default '',
  created_at timestamptz not null default now(),
  unique (pessoa_id, tipo, ref)
);
create index if not exists loja_pontos_pessoa on public.loja_pontos (portal_id, pessoa_id);
alter table public.loja_pontos enable row level security;
drop policy if exists loja_pontos_loja on public.loja_pontos;
create policy loja_pontos_loja on public.loja_pontos for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Clientes para chamar: a lista de cada vendedora (a gestora/Claude monta; a pessoa marca "chamei").
create table if not exists public.loja_chamar (
  id         uuid primary key default gen_random_uuid(),
  portal_id  uuid not null references public.portais (id) on delete cascade,
  pessoa_id  uuid not null references public.loja_equipe (id) on delete cascade,
  nome       text not null,
  whatsapp   text not null default '',
  resumo     text not null default '',
  comprou    text not null default '',
  mensagem   text not null default '',
  ordem      int not null default 0,
  chamado_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists loja_chamar_pessoa on public.loja_chamar (portal_id, pessoa_id);
alter table public.loja_chamar enable row level security;
drop policy if exists loja_chamar_loja on public.loja_chamar;
create policy loja_chamar_loja on public.loja_chamar for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Ao marcar a missão: 10 pontos (só se for no mesmo dia da missão) e, com todas feitas, 1 estrela.
create or replace function public.trg_pontos_missao() returns trigger language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Recife')::date;
begin
  if new.feito and not coalesce(old.feito, false) then
    if hoje = new.dia then
      insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
        values (new.portal_id, new.pessoa_id, new.dia, 'missao', new.pontos, new.id::text, left(new.texto, 80)) on conflict do nothing;
      if not exists (select 1 from loja_missao_dia m where m.pessoa_id = new.pessoa_id and m.dia = new.dia and not m.feito) then
        insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
          values (new.portal_id, new.pessoa_id, new.dia, 'estrela', 0, new.dia::text, 'Todas as missões do dia') on conflict do nothing;
      end if;
    end if;
  elsif not new.feito and coalesce(old.feito, false) then
    delete from loja_pontos where pessoa_id = new.pessoa_id and tipo = 'missao' and ref = new.id::text;
    delete from loja_pontos where pessoa_id = new.pessoa_id and tipo = 'estrela' and ref = new.dia::text;
  end if;
  return new;
end $$;
drop trigger if exists pontos_missao on public.loja_missao_dia;
create trigger pontos_missao after update of feito on public.loja_missao_dia for each row execute function public.trg_pontos_missao();

-- Fecha as semanas já terminadas (segunda a domingo, a partir de 09/11/2026): 80% ou mais dos atendimentos com resultado = +50.
create or replace function public.pontos_fechar_semanas() returns integer language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Recife')::date; ws date := date '2026-11-09'; r record; n int := 0;
begin
  while ws + 6 < hoje loop
    for r in
      select a.portal_id, a.pessoa_id, count(*) total, count(*) filter (where a.resultado is not null) feitos
      from loja_vez_atend a where a.dia between ws and ws + 6 and a.pessoa_id is not null group by 1, 2
    loop
      if r.total >= 5 and r.feitos * 100 >= 80 * r.total then
        insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
          values (r.portal_id, r.pessoa_id, ws + 6, 'semana', 50, ws::text, 'Semana com a lista da vez em dia') on conflict do nothing;
        n := n + 1;
      end if;
    end loop;
    ws := ws + 7;
  end loop;
  return n;
end $$;
revoke all on function public.pontos_fechar_semanas() from public, anon, authenticated;

-- Termina o atendimento (igual ao anterior) e, se foi venda indicada por uma colega em nov/dez de 2026, dá +20 pontos a ela.
drop function if exists public.vez_encerrar(uuid, text, text, text, text);
create or replace function public.vez_encerrar(p_token uuid, p_resultado text, p_motivo text, p_cliente text, p_obs text, p_indicou uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date; aberto uuid; ind uuid;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  if p_resultado not in ('vendeu', 'nao_vendeu') then return; end if;
  select id into aberto from public.loja_vez_atend where portal_id = q.portal_id and pessoa_id = q.id and dia = hoje and fim_em is null order by inicio_em desc limit 1;
  if aberto is not null then
    select e.id into ind from loja_equipe e where e.id = p_indicou and e.portal_id = q.portal_id and e.id <> q.id and coalesce(e.ativo, true);
    update public.loja_vez_atend set fim_em = now(), resultado = p_resultado, motivo = left(coalesce(p_motivo, ''), 200), cliente = left(coalesce(p_cliente, ''), 80), obs = left(coalesce(p_obs, ''), 300),
      indicada_por = case when p_resultado = 'vendeu' then ind end where id = aberto;
    if p_resultado = 'vendeu' and ind is not null and hoje between date '2026-11-01' and date '2026-12-31' then
      insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
        values (q.portal_id, ind, hoje, 'indicacao', 20, aberto::text, 'Indicou uma cliente que comprou com ' || split_part(q.nome, ' ', 1)) on conflict do nothing;
    end if;
  end if;
  insert into public.loja_vez_fila (portal_id, loja, dia, pessoa_id, status, ordem_em) values (q.portal_id, q.loja, hoje, q.id, 'fila', now())
    on conflict (portal_id, loja, dia, pessoa_id) do update set status = 'fila', ordem_em = now();
end $$;
revoke execute on function public.vez_encerrar(uuid, text, text, text, text, uuid) from public;
grant execute on function public.vez_encerrar(uuid, text, text, text, text, uuid) to anon, authenticated;

-- Pontos, clientes para chamar e colegas (para o "indicou"), em uma chamada só.
create or replace function public.vez_extras(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date; ws date; tot int; fe int; saldo int; acum int;
begin
  select * into q from public.vez_quem(p_token); if not found then return null; end if;
  ws := hoje - ((extract(isodow from hoje)::int) - 1);
  select count(*), count(*) filter (where resultado is not null) into tot, fe from loja_vez_atend where pessoa_id = q.id and dia between ws and ws + 6;
  select coalesce(sum(pontos), 0), coalesce(sum(pontos) filter (where pontos > 0), 0) into saldo, acum from loja_pontos where pessoa_id = q.id;
  return jsonb_build_object(
    'pontos', jsonb_build_object('saldo', saldo, 'acumulado', acum, 'vouchers', saldo / 500,
      'estrelas', (select count(*) from loja_pontos where pessoa_id = q.id and tipo = 'estrela'),
      'estrela_hoje', exists (select 1 from loja_pontos where pessoa_id = q.id and tipo = 'estrela' and ref = hoje::text),
      'semana', jsonb_build_object('atend', tot, 'feitos', fe, 'bonus', exists (select 1 from loja_pontos where pessoa_id = q.id and tipo = 'semana' and ref = ws::text)),
      'hist', coalesce((select jsonb_agg(jsonb_build_object('dia', h.dia, 'tipo', h.tipo, 'pontos', h.pontos, 'texto', h.texto) order by h.created_at desc)
        from (select * from loja_pontos where pessoa_id = q.id and pontos <> 0 order by created_at desc limit 8) h), '[]'::jsonb)),
    'chamar', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'whatsapp', c.whatsapp, 'resumo', c.resumo, 'comprou', c.comprou, 'mensagem', c.mensagem, 'feito', c.chamado_em is not null) order by (c.chamado_em is not null), c.ordem)
      from loja_chamar c where c.pessoa_id = q.id), '[]'::jsonb),
    'colegas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'nome', split_part(e.nome, ' ', 1)) order by e.nome)
      from loja_equipe e where e.portal_id = q.portal_id and coalesce(e.ativo, true) and e.id <> q.id and (coalesce(e.loja, '') in ('', q.loja))), '[]'::jsonb));
end $$;

create or replace function public.vez_chamar_marcar(p_token uuid, p_id uuid, p_feito boolean) returns void
language plpgsql security definer set search_path = public as $$
declare q record;
begin
  select * into q from public.vez_quem(p_token); if not found then return; end if;
  update loja_chamar set chamado_em = case when p_feito then now() else null end where id = p_id and pessoa_id = q.id;
end $$;

do $$ declare f text; begin
  foreach f in array array['vez_extras(uuid)', 'vez_chamar_marcar(uuid,uuid,boolean)'] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

-- Fecha as semanas todo dia às 06:10 (Recife); só soma o que ainda não foi somado.
select cron.schedule('pontos-semanas', '10 9 * * *', 'select public.pontos_fechar_semanas()');
