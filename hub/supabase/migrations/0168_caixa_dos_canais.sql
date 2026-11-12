-- As vendas lançadas no link de vendas por canal (/canais?t=) somam o Fechamento de caixa do dia.
-- O dia que a loja (ou a equipe) já fechou à mão não é tocado: só o dia vazio ou o que veio daqui (origem = 'canais').
-- Quem lança no link escreve o nome à mão: "Mih" ou "Shu" viram a vendedora cujo nome começa assim; o resto vai para "Outras vendas".
set lock_timeout = '8s';

alter table public.loja_caixa add column if not exists origem text;

-- Corrigir o dia no Hub tira a marca: daí em diante ele é da loja e o link não sobrescreve mais.
create or replace function public.caixa_tira_origem() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('lm.caixa_canais', true), '') <> '1' then new.origem := null; end if;
  return new;
end $$;
drop trigger if exists caixa_tira_origem on public.loja_caixa;
create trigger caixa_tira_origem before update on public.loja_caixa for each row execute function public.caixa_tira_origem();

create or replace function public.caixa_dos_canais(p_portal uuid, p_dia date) returns void
language plpgsql security definer set search_path = public as $$
declare
  atual public.loja_caixa;
  fat numeric; n integer; pc integer; vend jsonb; canais text;
begin
  -- Empresa com várias lojas fecha o caixa por loja e o link não diz a loja: fica de fora.
  if exists (select 1 from public.portais where id = p_portal and coalesce(array_length(lojas, 1), 0) > 1) then return; end if;
  select * into atual from public.loja_caixa where portal_id = p_portal and loja is null and dia = p_dia;
  if atual.id is not null and atual.origem is distinct from 'canais' then return; end if;

  select coalesce(sum(valor), 0), count(*), coalesce(sum(pecas), 0) into fat, n, pc
  from public.loja_canais_registro where portal_id = p_portal and dia = p_dia and tipo = 'venda';
  if n = 0 then
    delete from public.loja_caixa where id = atual.id;
    return;
  end if;

  -- Por vendedora: o nome escrito no link casa com o começo do nome de quem está na equipe.
  with r as (
    select x.valor, x.pecas, coalesce(
      (select e.id from public.loja_equipe e
        where e.portal_id = p_portal and e.ativo and length(trim(x.quem)) >= 2
          and starts_with(lower(split_part(trim(e.nome), ' ', 1)), lower(trim(x.quem)))
        order by e.nome limit 1),
      -- Apelido ("Mih" para Milene): as duas primeiras letras, quando só uma pessoa do time começa assim.
      (select min(e.id::text)::uuid from public.loja_equipe e
        where e.portal_id = p_portal and e.ativo and length(trim(x.quem)) >= 2
          and left(lower(trim(e.nome)), 2) = left(lower(trim(x.quem)), 2)
        having count(*) = 1)) as pessoa
    from public.loja_canais_registro x where x.portal_id = p_portal and x.dia = p_dia and x.tipo = 'venda'
  ), g as (
    select r.pessoa, coalesce(split_part(trim(e.nome), ' ', 1), 'Outras vendas') as nome,
      round(sum(r.valor), 2) as faturamento, count(*) as vendas, sum(r.pecas) as pecas
    from r left join public.loja_equipe e on e.id = r.pessoa group by r.pessoa, e.nome
  )
  select jsonb_agg(jsonb_build_object('pessoa_id', pessoa, 'nome', nome, 'faturamento', faturamento, 'vendas', vendas, 'pecas', pecas)
    order by pessoa is null, nome) into vend from g;

  select string_agg(format('%s R$ %s', canal, replace(to_char(t, 'FM9999990D00'), '.', ',')), ' · ' order by t desc) into canais
  from (select canal, sum(valor) t from public.loja_canais_registro where portal_id = p_portal and dia = p_dia and tipo = 'venda' group by canal) c;

  perform set_config('lm.caixa_canais', '1', true);
  insert into public.loja_caixa (portal_id, loja, dia, faturamento, vendas, pecas, vendedoras, obs, origem)
  values (p_portal, null, p_dia, round(fat, 2), n, pc, vend, left('Somado do link de vendas por canal: ' || canais, 500), 'canais')
  on conflict (portal_id, loja, dia) do update set
    faturamento = excluded.faturamento, vendas = excluded.vendas, pecas = excluded.pecas,
    vendedoras = excluded.vendedoras, obs = excluded.obs, origem = 'canais';
  perform set_config('lm.caixa_canais', '', true);
end $$;
revoke execute on function public.caixa_dos_canais(uuid, date) from public, anon, authenticated;

create or replace function public.canais_somam_caixa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Refaz o dia de antes e o de depois (na correção de um lançamento os dois podem ser diferentes).
  if tg_op <> 'INSERT' and old.tipo = 'venda' then perform public.caixa_dos_canais(old.portal_id, old.dia); end if;
  if tg_op <> 'DELETE' and new.tipo = 'venda' then perform public.caixa_dos_canais(new.portal_id, new.dia); end if;
  return null;
end $$;
drop trigger if exists canais_somam_caixa on public.loja_canais_registro;
create trigger canais_somam_caixa after insert or update or delete on public.loja_canais_registro
  for each row execute function public.canais_somam_caixa();
