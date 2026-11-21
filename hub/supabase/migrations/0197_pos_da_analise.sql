-- Pós da análise da semana: quando a Camilla publica a análise, a CS ganha um lembrete para o dia seguinte:
-- olhar os stories e a loja e mandar para a lojista uma mensagem ligando um ponto da análise ao que viu
-- (mostra que a CS leu a análise, conecta o time e valida o suporte).
set lock_timeout = '8s';
create or replace function public.pos_da_analise() returns trigger
language plpgsql security definer set search_path = public as $$
declare loja text; dono text; dia date := (now() at time zone 'America/Recife')::date + 1; cs uuid;
begin
  if not new.publicada or (tg_op = 'UPDATE' and old.publicada) then return new; end if;
  if extract(isodow from dia) = 7 then dia := dia + 1; end if;
  select p.loja, split_part(coalesce(p.responsavel, ''), ' ', 1) into loja, dono from portais p where p.id = new.portal_id;
  for cs in select id from perfis where papel = 'equipe' and monta and not aprova and conversas_equipe loop
    if not exists (select 1 from equipe_lembretes l where l.portal_id = new.portal_id and l.responsavel = cs and l.quando = dia and l.texto like '%pós da análise%') then
      insert into equipe_lembretes (portal_id, texto, quando, responsavel, feito, criado_por) values (new.portal_id,
        loja || ' · pós da análise da semana: abra a análise publicada, olhe os stories de ontem e o que a loja postou, e mande para '
        || coalesce(nullif(dono, ''), 'a lojista') || ' uma mensagem ligando 1 ponto da análise ao que você viu: o que já está indo bem e o que dá para ajustar hoje. '
        || 'Comece com "Aqui é a Claudia, da Loja Magnética. Li a análise da semana que a Camilla te mandou…" e termine com duas opções que levam ao próximo passo.',
        dia, cs, false, 'Hub');
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists pos_da_analise on public.loja_leituras;
create trigger pos_da_analise after insert or update of publicada on public.loja_leituras for each row execute function public.pos_da_analise();
