-- Semana em dia (resultado marcado em 80% ou mais dos atendimentos, mínimo de 5): vale 5 estrelas, sem pontos.
create or replace function public.pontos_fechar_semanas() returns integer language plpgsql security definer set search_path = public as $$
declare hoje date := (now() at time zone 'America/Recife')::date; ws date := date '2026-11-09'; r record; n int := 0;
begin
  while ws + 6 < hoje loop
    -- Semana em dia: 80% ou mais dos atendimentos com resultado (mínimo de 5) = +50 pontos e 20 estrelas.
    for r in
      select a.portal_id, a.pessoa_id, count(*) total, count(*) filter (where a.resultado is not null) feitos
      from loja_vez_atend a where a.dia between ws and ws + 6 and a.pessoa_id is not null group by 1, 2
    loop
      if r.total >= 5 and r.feitos * 100 >= 80 * r.total then
        insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, estrelas, ref, texto)
          values (r.portal_id, r.pessoa_id, ws + 6, 'semana', 0, 5, ws::text, 'Semana com a lista da vez em dia') on conflict do nothing;
        n := n + 1;
      end if;
    end loop;
    -- Clientes da semana cadastrados completos (WhatsApp e aniversário): +20 pontos para quem cuida do caixa da loja, que é quem cadastra.
    for r in
      select e.portal_id, e.id pessoa_id, count(*) total,
             count(*) filter (where coalesce(c.whatsapp, '') <> '' and c.aniversario is not null) completos
      from loja_equipe e join loja_clientes c on c.portal_id = e.portal_id and (coalesce(e.loja, '') = '' or c.loja = e.loja)
      where e.responsavel_caixa and coalesce(e.ativo, true) and (c.created_at at time zone 'America/Recife')::date between ws and ws + 6
      group by 1, 2
    loop
      if r.total > 0 and r.completos = r.total then
        insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
          values (r.portal_id, r.pessoa_id, ws + 6, 'clientes', 20, ws::text, 'Clientes da semana cadastrados completos') on conflict do nothing;
        n := n + 1;
      end if;
    end loop;
    -- Caixa e relatórios: todos os dias de segunda a sábado lançados na loja e a conferência da semana feita = +20 pontos.
    for r in select e.portal_id, e.id pessoa_id, e.loja from loja_equipe e where e.responsavel_caixa and coalesce(e.ativo, true) loop
      if (select count(distinct c.dia) from loja_caixa c where c.portal_id = r.portal_id and (coalesce(r.loja, '') = '' or c.loja = r.loja) and c.dia between ws and ws + 5) = 6
         and exists (select 1 from loja_envios v where v.portal_id = r.portal_id and v.tipo = 'semanal' and v.periodo = ws::text) then
        insert into loja_pontos (portal_id, pessoa_id, dia, tipo, pontos, ref, texto)
          values (r.portal_id, r.pessoa_id, ws + 6, 'caixa', 20, ws::text, 'Caixas e relatórios da semana em dia') on conflict do nothing;
        n := n + 1;
      end if;
    end loop;
    ws := ws + 7;
  end loop;
  return n;
end $$;
revoke all on function public.pontos_fechar_semanas() from public, anon, authenticated;

-- Indique e ganhe: +20 pontos e 5 estrelas (vez_encerrar redefinida no banco com 5 estrelas).
