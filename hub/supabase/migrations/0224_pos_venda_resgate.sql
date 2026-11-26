-- Área da vendedora, todo dia: o pós-venda das clientes de ontem e as 10 clientes de resgate da estratégia da semana.
-- O pós-venda sai da lista de vendas que a loja anexou no caixa (Edge Function pos-venda, às 7h40 de Recife);
-- o resgate completa 10 clientes inativas (mais de 60 dias, sem contato no último mês) por vendedora.
set lock_timeout='8s';
alter table loja_chamar add column if not exists tipo text not null default 'resgate';
alter table loja_chamar add column if not exists dia date;
comment on column loja_chamar.tipo is 'pos_venda = cliente que comprou ontem (carimbo de conexão, sem oferecer); resgate = cliente inativa da estratégia da semana.';

create or replace function public.chamar_resgate_do_dia(p_portal uuid default null) returns int language plpgsql security definer set search_path = public as $$
declare e record; falta int; novos int := 0; hoje date := (now() at time zone 'America/Recife')::date;
begin
  for e in
    select q.id, q.portal_id, q.nome, q.loja, p.loja as marca
    from loja_equipe q join portais p on p.id = q.portal_id
    where coalesce(q.ativo, true) and q.vez_token is not null and p.ativo
      and not (coalesce(q.funcao, '') ~* '\m(dona|dono|s[óo]ci[ao]|propriet)')
      and (p_portal is null or q.portal_id = p_portal)
      and exists (select 1 from loja_clientes c where c.portal_id = q.portal_id)
  loop
    -- Mantém 10 clientes de resgate pendentes para cada vendedora.
    select 10 - count(*) into falta from loja_chamar where pessoa_id = e.id and tipo = 'resgate' and chamado_em is null;
    if falta <= 0 then continue; end if;
    with cand as (
      select c.*, (lower(split_part(coalesce(c.vendedora, ''), ' ', 1)) = lower(split_part(e.nome, ' ', 1))) as minha
      from loja_clientes c
      where c.portal_id = e.portal_id and c.whatsapp is not null and c.ultima_compra < hoje - 60
        and (e.loja is null or e.loja = '' or c.loja is null or c.loja = e.loja)
        and (lower(split_part(coalesce(c.vendedora, ''), ' ', 1)) = lower(split_part(e.nome, ' ', 1))
             or not exists (select 1 from loja_equipe o where o.portal_id = e.portal_id and coalesce(o.ativo, true) and o.vez_token is not null
                            and lower(split_part(o.nome, ' ', 1)) = lower(split_part(coalesce(c.vendedora, ''), ' ', 1))))
        and not exists (select 1 from loja_chamar x where x.portal_id = e.portal_id and x.created_at > now() - interval '30 days'
                        and (x.whatsapp = c.whatsapp or lower(x.nome) = lower(c.nome)))
      order by (lower(split_part(coalesce(c.vendedora, ''), ' ', 1)) = lower(split_part(e.nome, ' ', 1))) desc, c.total desc nulls last
      limit falta)
    insert into loja_chamar (portal_id, pessoa_id, nome, whatsapp, resumo, comprou, mensagem, ordem, tipo, dia)
    select e.portal_id, e.id, split_part(cand.nome, ' ', 1) || case when split_part(cand.nome, ' ', 2) <> '' then ' ' || split_part(cand.nome, ' ', 2) else '' end,
      cand.whatsapp,
      concat_ws(' · ', case when cand.n_compras > 0 then cand.n_compras || ' compras' end, case when cand.total > 0 then 'R$ ' || to_char(round(cand.total), 'FM999G999') || ' no total' end,
        'última em ' || to_char(cand.ultima_compra, 'DD/MM') || ' (' || (hoje - cand.ultima_compra) || ' dias)'),
      '',
      'Oi, ' || initcap(split_part(cand.nome, ' ', 1)) || '! Aqui é a ' || split_part(e.nome, ' ', 1) || ', da ' || coalesce(nullif(cand.loja, ''), nullif(e.loja, ''), e.marca) || '. Lembrei de você: chegou coleção nova com muita coisa no seu estilo. Te mando as fotos ou você já consegue vir na loja ver tudo e provar?',
      row_number() over (order by cand.minha desc, cand.total desc nulls last), 'resgate', hoje
    from cand;
    get diagnostics falta = row_count; novos := novos + falta;
  end loop;
  return novos;
end $$;

-- vez_extras: a lista do dia (pós-venda de ontem + resgate pendente ou feito hoje), com o tipo de cada cliente.
do $do$
declare src text; cfg text;
begin
  select prosrc, array_to_string(proconfig, ',') into src, cfg from pg_proc where proname = 'vez_extras';
  if src like '%pos_venda%' then return; end if;
  src := replace(src,
    $a$from loja_chamar c where c.pessoa_id = q.id), '[]'::jsonb)$a$,
    $b$from loja_chamar c where c.pessoa_id = q.id
        and ((c.tipo = 'pos_venda' and c.dia >= hoje - 1 and (c.chamado_em is null or (c.chamado_em at time zone 'America/Recife')::date = hoje))
          or (c.tipo <> 'pos_venda' and (c.chamado_em is null or (c.chamado_em at time zone 'America/Recife')::date = hoje)))), '[]'::jsonb)$b$);
  src := replace(src, $a$'mensagem', c.mensagem, 'feito', c.chamado_em is not null) order by (c.chamado_em is not null), c.ordem)$a$,
    $b$'mensagem', c.mensagem, 'feito', c.chamado_em is not null, 'tipo', c.tipo, 'dia', c.dia) order by (c.tipo <> 'pos_venda'), (c.chamado_em is not null), c.ordem)$b$);
  execute format('create or replace function public.vez_extras(p_token uuid) returns jsonb language plpgsql security definer %s as %L',
    case when cfg is not null then 'set ' || replace(cfg, '=', ' = ') else '' end, src);
end $do$;

-- Todo dia às 7h40 de Recife.
select cron.schedule('pos-venda-do-dia', '40 10 * * *', $c$
  select net.http_post(
    url := 'https://gnbjberxugnqzbxvzinh.supabase.co/functions/v1/pos-venda',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-aviso', (select decrypted_secret from vault.decrypted_secrets where name = 'aviso_chave')),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
$c$);
