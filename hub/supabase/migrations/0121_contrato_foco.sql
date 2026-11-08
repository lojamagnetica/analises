-- Contrato de Foco: o resultado nº 1 dos próximos 90 dias (fichas.resultado_n1) e o indicador (início · hoje · meta).
-- A equipe preenche na ficha; a loja vê no Diagnóstico e dá o "de acordo" no Hub, que marca a Jornada (check "foco")
-- e avisa quem aprova e quem monta. Se a equipe mudar o resultado ou o indicador, o "de acordo" volta a ser pedido.
set lock_timeout = '8s';

alter table public.fichas add column if not exists foco_de_acordo_em timestamptz;

create or replace function public.foco_mudou() returns trigger language plpgsql as $$
begin
  if new.resultado_n1 is distinct from old.resultado_n1 or new.indicador is distinct from old.indicador then
    new.foco_de_acordo_em := null;
  end if;
  return new;
end $$;
drop trigger if exists foco_mudou on public.fichas;
create trigger foco_mudou before update on public.fichas for each row execute function public.foco_mudou();

-- O que a loja vê do contrato (a ficha é só da equipe).
create or replace function public.contrato_foco(p uuid) returns table (resultado text, indicador text, de_acordo_em timestamptz)
language sql stable security definer set search_path = public as $$
  select f.resultado_n1, f.indicador, f.foco_de_acordo_em from fichas f where f.portal_id = p and public.pode_ver(p)
$$;
revoke all on function public.contrato_foco(uuid) from public, anon;
grant execute on function public.contrato_foco(uuid) to authenticated;

-- A loja dá o "de acordo".
create or replace function public.aceitar_contrato_foco(p uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.pode_ver(p) or public.is_equipe() then raise exception 'Só a loja dá o de acordo.'; end if;
  update fichas set foco_de_acordo_em = now() where portal_id = p and resultado_n1 is not null;
  insert into jornada_checks (portal_id, chave, feito, por_nome, updated_at) values (p, 'foco', true, 'A loja, no Hub', now())
    on conflict (portal_id, chave) do update set feito = true, por_nome = 'A loja, no Hub', updated_at = now();
  perform novidade_cs(p, 'etapa', '🤝 ' || nome_da_loja(p) || ' deu o de acordo no Contrato de Foco', '/painel?portal=' || p);
end $$;
revoke all on function public.aceitar_contrato_foco(uuid) from public, anon;
grant execute on function public.aceitar_contrato_foco(uuid) to authenticated;
