-- Contrato de Foco por loja: portal com mais de uma loja (ex.: feminino e masculino) tem um contrato para cada loja.
-- Sem contrato da loja, vale o da ficha (o geral). Mudar o resultado ou o indicador pede o de acordo de novo.
set lock_timeout = '8s';

create table if not exists public.loja_foco (
  portal_id uuid not null references public.portais(id) on delete cascade,
  loja text not null,
  resultado text,
  indicador text,
  curto text,
  trabalhando text[] not null default '{}',
  de_acordo_em timestamptz,
  updated_at timestamptz not null default now(),
  primary key (portal_id, loja)
);
alter table public.loja_foco enable row level security;
drop policy if exists loja_foco_ver on public.loja_foco;
create policy loja_foco_ver on public.loja_foco for select using (public.pode_ver(portal_id));
drop policy if exists loja_foco_equipe on public.loja_foco;
create policy loja_foco_equipe on public.loja_foco for all using (public.is_equipe()) with check (public.is_equipe());

create or replace function public.loja_foco_reabre() returns trigger language plpgsql as $$
begin
  if new.resultado is distinct from old.resultado or new.indicador is distinct from old.indicador then new.de_acordo_em := null; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists loja_foco_reabre on public.loja_foco;
create trigger loja_foco_reabre before update on public.loja_foco for each row execute function public.loja_foco_reabre();

drop function if exists public.contrato_foco(uuid);
create or replace function public.contrato_foco(p uuid, p_loja text default '')
returns table (resultado text, indicador text, de_acordo_em timestamptz, curto text, trabalhando text[])
language sql stable security definer set search_path = public as $$
  select l.resultado, l.indicador, l.de_acordo_em, l.curto, l.trabalhando
  from loja_foco l where l.portal_id = p and l.loja = coalesce(p_loja, '') and coalesce(p_loja, '') <> '' and public.pode_ver(p)
  union all
  select f.resultado_n1, f.indicador, f.foco_de_acordo_em, f.foco_curto, coalesce(f.fundamentos_trabalhando, '{}')
  from fichas f where f.portal_id = p and public.pode_ver(p)
    and not exists (select 1 from loja_foco l where l.portal_id = p and l.loja = coalesce(p_loja, '') and coalesce(p_loja, '') <> '')
$$;
revoke all on function public.contrato_foco(uuid, text) from public, anon;
grant execute on function public.contrato_foco(uuid, text) to authenticated;

drop function if exists public.aceitar_contrato_foco(uuid);
create or replace function public.aceitar_contrato_foco(p uuid, p_loja text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.pode_ver(p) or public.is_equipe() then raise exception 'Só a loja dá o de acordo.'; end if;
  if coalesce(p_loja, '') <> '' and exists (select 1 from loja_foco where portal_id = p and loja = p_loja) then
    update loja_foco set de_acordo_em = now() where portal_id = p and loja = p_loja and resultado is not null;
  else
    update fichas set foco_de_acordo_em = now() where portal_id = p and resultado_n1 is not null;
  end if;
  insert into jornada_checks (portal_id, chave, feito, por_nome, updated_at) values (p, 'foco', true, 'A loja, no Hub', now())
    on conflict (portal_id, chave) do update set feito = true, por_nome = 'A loja, no Hub', updated_at = now();
  perform novidade_cs(p, 'etapa', '🤝 ' || nome_da_loja(p) || coalesce(nullif(' · ' || coalesce(p_loja, ''), ' · '), '') || ' deu o de acordo no Contrato de Foco', '/painel?portal=' || p);
end $$;
revoke all on function public.aceitar_contrato_foco(uuid, text) from public, anon;
grant execute on function public.aceitar_contrato_foco(uuid, text) to authenticated;
