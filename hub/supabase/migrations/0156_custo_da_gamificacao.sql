-- Custo da gamificação: orçamento mensal (R$) e quanto custa cada ponto para a empresa. A gestão acompanha o custo no painel.
create table if not exists public.loja_gamificacao_config (
  portal_id uuid primary key references public.portais (id) on delete cascade,
  orcamento numeric not null default 1500 check (orcamento >= 0),
  custo_ponto numeric not null default 0.30 check (custo_ponto >= 0),
  updated_at timestamptz not null default now()
);
alter table public.loja_gamificacao_config enable row level security;
drop policy if exists loja_gamificacao_config_loja on public.loja_gamificacao_config;
create policy loja_gamificacao_config_loja on public.loja_gamificacao_config for all using (public.pode_ver(portal_id)) with check (public.pode_ver(portal_id));

-- Foto da pessoa (caminho no balde "marcas") e a lojinha trazendo a magnética do mês (líder até agora e a do mês anterior) para o crachá.
alter table public.loja_equipe add column if not exists foto text;
create or replace function public.vez_lojinha(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare q record; hoje date := (now() at time zone 'America/Recife')::date; mi date; destaque jsonb; ant record;
begin
  select * into q from public.vez_quem(p_token); if not found then return null; end if;
  mi := date_trunc('month', hoje)::date;
  with r as (
    select e.id, split_part(e.nome, ' ', 1) nome, e.foto, coalesce(sum(p.estrelas) filter (where p.dia >= mi), 0)::int est
    from loja_equipe e left join loja_pontos p on p.pessoa_id = e.id
    where e.portal_id = q.portal_id and coalesce(e.ativo, true) and coalesce(e.loja, '') <> '' group by e.id, e.nome, e.foto)
  select jsonb_build_object('mes', to_char(hoje, 'MM/YYYY'), 'lider', (select nome from r order by est desc, nome limit 1),
    'foto', (select foto from r order by est desc, nome limit 1), 'estrelas', coalesce((select max(est) from r), 0)) into destaque;
  select split_part(e.nome, ' ', 1) nome, e.foto, p.ref into ant from loja_pontos p join loja_equipe e on e.id = p.pessoa_id where p.portal_id = q.portal_id and p.tipo = 'destaque' order by p.ref desc, p.created_at limit 1;
  return jsonb_build_object(
    'saldo', (select coalesce(sum(pontos), 0) from loja_pontos where pessoa_id = q.id),
    'premios', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'pontos', p.pontos, 'foto', p.foto) order by p.pontos, p.nome)
      from loja_premios p where p.portal_id = q.portal_id and p.ativo), '[]'::jsonb),
    'meus', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'nome', r.premio_nome, 'pontos', r.pontos, 'status', r.status, 'em', r.created_at) order by r.created_at desc)
      from (select * from loja_resgates where pessoa_id = q.id order by created_at desc limit 6) r), '[]'::jsonb),
    'destaque', destaque || jsonb_build_object('anterior', case when ant.nome is null then null else jsonb_build_object('nome', ant.nome, 'mes', ant.ref, 'foto', ant.foto) end));
end $$;
